import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'offline_chat_screen.dart';
import 'offline_sync_service.dart';

// ============================================================================
// PLANTILLA PARA EL DÍA DEL EXAMEN
//
// Configura la URL base ANTES de empezar (según dónde corras la app):
//   - Flutter Web (chrome) en la misma PC que el backend: http://localhost:8080
//   - Emulador Android:                                    http://10.0.2.2:8080
//   - Celular físico en la misma WiFi que tu PC:            http://<IP-LAN-DE-TU-PC>:8080
//     (revisa tu IP con `ipconfig`, ej: http://192.168.0.7:8080)
//
// Durante el examen NO necesitas tocar este archivo: el nombre del endpoint
// (ej. "clientes", "barberos") y el JSON para crear registros se escriben
// directamente en la pantalla, en tiempo de ejecución.
// ============================================================================
const String baseUrl = 'http://localhost:8080';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  OfflineSyncService.instance
      .configureUrlBuilder((endpoint) => '$baseUrl/api/$endpoint');
  await OfflineSyncService.instance.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cliente API',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: const ApiScreen(),
    );
  }
}

class ApiScreen extends StatefulWidget {
  const ApiScreen({super.key});

  @override
  State<ApiScreen> createState() => _ApiScreenState();
}

class _ApiScreenState extends State<ApiScreen> {
  final endpointController = TextEditingController(text: 'clientes');
  final jsonController =
      TextEditingController(text: '{\n  "nombre": "Ejemplo"\n}');
  final _sync = OfflineSyncService.instance;

  List<dynamic> items = [];
  String? error;
  bool loading = false;
  bool showingCached = false;
  bool online = true;
  int pendingCount = 0;

  StreamSubscription<bool>? _onlineSub;
  StreamSubscription<int>? _pendingSub;

  String get endpoint => endpointController.text.trim();
  String get listUrl => '$baseUrl/api/$endpoint';

  @override
  void initState() {
    super.initState();
    online = _sync.isOnline;
    pendingCount = _sync.pendingCount;
    _onlineSub = _sync.onlineStream.listen((value) {
      if (!mounted) return;
      setState(() => online = value);
      if (value) fetchItems();
    });
    _pendingSub = _sync.pendingCountStream.listen((value) {
      if (!mounted) return;
      setState(() => pendingCount = value);
    });
    fetchItems();
  }

  Future<void> fetchItems() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await http
          .get(Uri.parse(listUrl))
          .timeout(const Duration(seconds: 6));
      if (res.statusCode >= 400) {
        throw Exception('HTTP ${res.statusCode}: ${res.body}');
      }
      final fetched = jsonDecode(res.body) as List<dynamic>;
      await _sync.cacheItems(endpoint, fetched);
      if (!mounted) return;
      setState(() {
        items = fetched;
        showingCached = false;
      });
    } catch (e) {
      // Sin conexión (o el backend no responde): mostramos la última copia
      // guardada localmente en vez de una pantalla vacía.
      final cached = await _sync.getCachedItems(endpoint);
      if (!mounted) return;
      setState(() {
        items = cached;
        showingCached = cached.isNotEmpty;
        error = cached.isEmpty ? e.toString() : null;
      });
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> createItem() async {
    setState(() {
      loading = true;
      error = null;
    });
    final body = jsonController.text;

    http.Response res;
    try {
      res = await http
          .post(
            Uri.parse(listUrl),
            headers: {'Content-Type': 'application/json'},
            body: body,
          )
          .timeout(const Duration(seconds: 6));
    } catch (_) {
      // Fallo a nivel de red (sin internet, timeout, host inalcanzable):
      // no fue un error del servidor, así que se puede reintentar luego.
      await _queueOffline(body);
      if (mounted) setState(() => loading = false);
      return;
    }

    try {
      if (res.statusCode >= 400) {
        throw Exception('HTTP ${res.statusCode}: ${res.body}');
      }
      await fetchItems();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _queueOffline(String body) async {
    await _sync.queueMutation(endpoint, body);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Sin conexión: el registro se guardó localmente y se enviará '
          'automáticamente cuando vuelvas a tener internet.',
        ),
      ),
    );
  }

  @override
  void dispose() {
    endpointController.dispose();
    jsonController.dispose();
    _onlineSub?.cancel();
    _pendingSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cliente API genérico'),
        actions: [
          IconButton(
            icon: const Icon(Icons.smart_toy_outlined),
            tooltip: 'Asistente offline',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const OfflineChatScreen()),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!online || pendingCount > 0)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: online ? Colors.orange.shade100 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      online ? Icons.sync : Icons.cloud_off,
                      size: 18,
                      color: Colors.black87,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        online
                            ? 'En línea — sincronizando $pendingCount registro(s) pendiente(s)…'
                            : showingCached
                                ? 'Sin conexión — mostrando datos guardados localmente'
                                    '${pendingCount > 0 ? ' ($pendingCount pendiente(s) por enviar)' : ''}'
                                : 'Sin conexión',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            TextField(
              controller: endpointController,
              decoration: const InputDecoration(
                labelText: 'Endpoint (ej: clientes, barberos, pedidos)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: loading ? null : fetchItems,
              icon: const Icon(Icons.download),
              label: const Text('Cargar lista (GET)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: jsonController,
              maxLines: 3,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
              decoration: const InputDecoration(
                labelText: 'JSON para crear (POST)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: loading ? null : createItem,
              icon: const Icon(Icons.add),
              label: const Text('Crear (POST)'),
            ),
            const SizedBox(height: 12),
            if (loading) const LinearProgressIndicator(),
            if (error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                margin: const EdgeInsets.only(top: 8),
                color: Colors.red.shade100,
                child: Text(
                  error!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            const Divider(height: 24),
            Expanded(
              child: items.isEmpty
                  ? const Center(child: Text('Sin datos cargados aún'))
                  : ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final raw = items[index];
                        final text = raw is Map<String, dynamic>
                            ? raw.entries
                                .where((e) => e.value is! List && e.value is! Map)
                                .map((e) => '${e.key}: ${e.value}')
                                .join('   •   ')
                            : raw.toString();
                        return Card(
                          child: ListTile(
                            title: Text(text.isEmpty ? raw.toString() : text),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
