import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// A mutation (create/update) that couldn't reach the server and is waiting
/// to be replayed once connectivity comes back.
class PendingMutation {
  PendingMutation({
    required this.endpoint,
    required this.body,
    required this.queuedAt,
  });

  final String endpoint;
  final String body;
  final DateTime queuedAt;

  Map<String, dynamic> toJson() => {
    'endpoint': endpoint,
    'body': body,
    'queuedAt': queuedAt.toIso8601String(),
  };

  factory PendingMutation.fromJson(Map<String, dynamic> json) =>
      PendingMutation(
        endpoint: json['endpoint'] as String,
        body: json['body'] as String,
        queuedAt: DateTime.parse(json['queuedAt'] as String),
      );
}

/// Generic offline-first layer for the REST client screen: the app doesn't
/// know the domain model ahead of time (the endpoint is typed at runtime),
/// so instead of a typed local database this caches the last successful GET
/// per endpoint and queues POSTs made while offline, replaying them in order
/// as soon as connectivity is restored.
class OfflineSyncService {
  OfflineSyncService._();
  static final OfflineSyncService instance = OfflineSyncService._();

  static const _cachePrefix = 'offline_cache_';
  static const _queueKey = 'offline_pending_mutations';

  final _connectivity = Connectivity();
  final _pendingController = StreamController<int>.broadcast();
  final _onlineController = StreamController<bool>.broadcast();

  List<PendingMutation> _queue = [];
  bool _online = true;
  String Function(String endpoint)? _urlBuilder;

  /// Must be called once at startup with a function that turns an endpoint
  /// name (e.g. "clientes") into the full POST URL, so this service doesn't
  /// need to know about `baseUrl` itself.
  void configureUrlBuilder(String Function(String endpoint) builder) {
    _urlBuilder = builder;
  }

  /// Emits the pending-mutation count every time it changes.
  Stream<int> get pendingCountStream => _pendingController.stream;

  /// Emits the current connectivity state every time it changes.
  Stream<bool> get onlineStream => _onlineController.stream;

  bool get isOnline => _online;
  int get pendingCount => _queue.length;

  Future<void> init() async {
    await _loadQueue();
    _pendingController.add(_queue.length);

    final initial = await _connectivity.checkConnectivity();
    _online = !initial.contains(ConnectivityResult.none);
    _onlineController.add(_online);

    _connectivity.onConnectivityChanged.listen((results) {
      final nowOnline = !results.contains(ConnectivityResult.none);
      final wasOffline = !_online;
      _online = nowOnline;
      _onlineController.add(_online);
      if (nowOnline && wasOffline) {
        // Connection just came back: try to flush the queue.
        syncPending();
      }
    });
  }

  Future<void> _loadQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null) return;
    final list = jsonDecode(raw) as List<dynamic>;
    _queue = list
        .map((e) => PendingMutation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> _saveQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _queueKey,
      jsonEncode(_queue.map((m) => m.toJson()).toList()),
    );
    _pendingController.add(_queue.length);
  }

  /// Persists the last successful GET response for [endpoint] so it can be
  /// shown while offline.
  Future<void> cacheItems(String endpoint, List<dynamic> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_cachePrefix$endpoint', jsonEncode(items));
  }

  /// Returns the last cached list for [endpoint], or an empty list if there
  /// is no cache yet (e.g. never loaded it while online).
  Future<List<dynamic>> getCachedItems(String endpoint) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_cachePrefix$endpoint');
    if (raw == null) return [];
    return jsonDecode(raw) as List<dynamic>;
  }

  /// Queues a POST body for [endpoint] to be sent once back online.
  Future<void> queueMutation(String endpoint, String body) async {
    _queue.add(PendingMutation(
      endpoint: endpoint,
      body: body,
      queuedAt: DateTime.now(),
    ));
    await _saveQueue();
  }

  /// Replays queued mutations (via the configured URL builder) in order.
  /// Stops at the first failure (keeps ordering/at-least-once semantics) so
  /// a still-broken connection doesn't silently drop later mutations.
  Future<void> syncPending() async {
    final urlFor = _urlBuilder;
    if (urlFor == null || _queue.isEmpty) return;

    while (_queue.isNotEmpty) {
      final mutation = _queue.first;
      try {
        final res = await http.post(
          Uri.parse(urlFor(mutation.endpoint)),
          headers: {'Content-Type': 'application/json'},
          body: mutation.body,
        );
        if (res.statusCode >= 400) break;
        _queue.removeAt(0);
        await _saveQueue();
      } catch (_) {
        break;
      }
    }
  }
}
