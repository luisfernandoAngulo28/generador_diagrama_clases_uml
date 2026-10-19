import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'case_api.dart';
import 'live_notifications.dart';
import 'uml_live_models.dart';

/// Conexión de SOLO LECTURA a la sala de un diagrama (mismo protocolo
/// Socket.io que el editor web). Escucha:
///   session:init-state  → historial del chat al entrar
///   diagram-update      → cambios del lienzo hechos en la web
///   diagram:authorship  → quién creó / editó cada clase
///   locks-update        → qué clase está editando cada uno
///   presence            → cuántos están conectados
///   chat:new-message    → chat grupal y respuestas de la IA
///   ai:status           → "la IA está pensando para X"
/// Nunca emite cambios del diagrama ni mensajes: el móvil solo observa.
class LiveRoom extends ChangeNotifier {
  LiveRoom(this.diagram);

  UmlDiagramView diagram;
  final List<ChatMessageView> messages = [];
  final Map<String, String> thinkingFor = {}; // requestId → nombre
  Map<String, String> locks = {}; // classId → quién la edita
  Set<String> recentlyChanged = {}; // clases resaltadas tras un cambio remoto
  int connectedCount = 0;
  bool connected = false;
  String? lastEvent; // aviso breve para la UI ("Luis modificó Pedido")

  io.Socket? _socket;
  Timer? _highlightTimer;
  DateTime _lastDiagramNotification = DateTime.fromMillisecondsSinceEpoch(0);
  final _notifications = LiveNotifications.instance;
  final _api = CaseApi.instance;

  void connect() {
    final socket = io.io(
      _api.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': _api.token})
          .disableAutoConnect()
          .enableReconnection()
          .build(),
    );
    _socket = socket;

    socket.onConnect((_) {
      connected = true;
      // Igual que la web: el JWT del handshake identifica al usuario.
      socket.emit('join-diagram', {
        'diagramId': diagram.id,
        'userName': _api.userName,
      });
      notifyListeners();
    });
    socket.onDisconnect((_) {
      connected = false;
      notifyListeners();
    });

    socket.on('session:init-state', (data) {
      final chat = (data is Map ? data['chat'] : null) as List? ?? const [];
      messages
        ..clear()
        ..addAll(chat.whereType<Map>().map(ChatMessageView.fromJson));
      notifyListeners();
    });

    socket.on('diagram-update', (data) {
      if (data is! Map) return;
      final previous = {for (final c in diagram.classes) c.id: c.contentKey};
      diagram = diagram.fromReactFlow(
        data['nodes'] as List? ?? const [],
        data['edges'] as List? ?? const [],
      );
      final changed = diagram.classes
          .where((c) => previous[c.id] != c.contentKey)
          .map((c) => c.id)
          .toSet();
      if (changed.isEmpty) {
        notifyListeners(); // solo movieron clases en el lienzo
        return;
      }
      final editor = data['editorName'] as String? ?? 'Alguien';
      final names = diagram.classes
          .where((c) => changed.contains(c.id))
          .map((c) => c.name)
          .join(', ');
      _highlight(changed);
      lastEvent = '$editor modificó $names';
      _notifyDiagramChange(editor, names);
      notifyListeners();
    });

    socket.on('diagram:authorship', (data) {
      if (data is Map) {
        diagram = diagram.withAuthorship(data);
        notifyListeners();
      }
    });

    socket.on('locks-update', (data) {
      if (data is! Map) return;
      locks = {
        for (final e in data.entries)
          '${e.key}': '${(e.value as Map?)?['editorName'] ?? 'Otro usuario'}',
      };
      notifyListeners();
    });

    socket.on('presence', (data) {
      connectedCount =
          (data is Map ? data['count'] as num? : null)?.toInt() ??
          connectedCount;
      notifyListeners();
    });

    socket.on('chat:new-message', (data) {
      if (data is! Map) return;
      final message = ChatMessageView.fromJson(data);
      if (messages.any((m) => m.id == message.id)) return;
      messages.add(message);
      if (message.senderId != _api.userId) {
        final title = message.isAi
            ? 'Moderador IA → ${message.addressedTo ?? 'la sala'}'
            : '${message.senderName} en "${diagram.name}"';
        _notifications.show(title, message.text);
      }
      notifyListeners();
    });

    socket.on('ai:status', (data) {
      if (data is! Map) return;
      final id = '${data['requestId']}';
      if (data['isThinking'] == true) {
        thinkingFor[id] = '${data['promptBy']}';
      } else {
        thinkingFor.remove(id);
      }
      notifyListeners();
    });

    socket.connect();
  }

  /// Un aviso cada 10 s como máximo: el editor web sincroniza en ráfagas.
  void _notifyDiagramChange(String editor, String names) {
    final now = DateTime.now();
    if (now.difference(_lastDiagramNotification) <
        const Duration(seconds: 10)) {
      return;
    }
    _lastDiagramNotification = now;
    _notifications.show(
      'Diagrama "${diagram.name}" actualizado',
      '$editor modificó $names',
    );
  }

  void _highlight(Set<String> classIds) {
    recentlyChanged = classIds;
    _highlightTimer?.cancel();
    _highlightTimer = Timer(const Duration(seconds: 6), () {
      recentlyChanged = {};
      lastEvent = null;
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _highlightTimer?.cancel();
    _socket?.dispose();
    super.dispose();
  }
}
