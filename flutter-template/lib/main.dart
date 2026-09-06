import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:speech_to_text/speech_to_text.dart' as stt;

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
// ATAJOS DE EXAMEN:
//   • Botones de PRESET: rellenan el endpoint + JSON de prueba con un tap.
//   • Botón de MICRÓFONO: dicta el JSON por voz (evita escribir llaves/comillas).
// ============================================================================
// URL del backend Spring Boot generado (editable en tiempo de ejecución).
// Defaults:
//   Emulador Android  → http://10.0.2.2:8080
//   Celular físico    → http://<IP-LAN-DE-TU-PC>:8080  (ej: http://192.168.0.7:8080)
//   Flutter Web       → http://localhost:8080
String _baseUrl = 'http://10.0.2.2:8080';
String get baseUrl => _baseUrl;

// ---------------------------------------------------------------------------
// Presets de ejemplo — ajusta los nombres de entidades el día del examen.
// Puedes agregar más filas aquí antes de compilar el APK.
// ---------------------------------------------------------------------------
const List<Map<String, String>> _presets = [
  {
    'label': 'Cliente',
    'endpoint': 'clientes',
    'json': '{\n  "nombre": "Carlos Mamani",\n  "telefono": "70012345",\n  "email": "carlos@example.com"\n}',
  },
  {
    'label': 'Barbero',
    'endpoint': 'barberos',
    'json': '{\n  "nombre": "Luis Quispe",\n  "especialidad": "Corte clasico"\n}',
  },
  {
    'label': 'Turno',
    'endpoint': 'turnos',
    'json': '{\n  "fecha": "2026-09-23",\n  "hora": "10:00",\n  "clienteId": 1,\n  "barberoId": 1\n}',
  },
  {
    'label': 'Servicio',
    'endpoint': 'servicios',
    'json': '{\n  "nombre": "Corte de cabello",\n  "precio": 50.0,\n  "duracionMinutos": 30\n}',
  },
  {
    'label': 'Producto',
    'endpoint': 'productos',
    'json': '{\n  "nombre": "Shampoo Pro",\n  "precio": 35.0,\n  "stock": 100\n}',
  },
  {
    'label': 'Pedido',
    'endpoint': 'pedidos',
    'json': '{\n  "clienteId": 1,\n  "total": 150.0,\n  "estado": "PENDIENTE"\n}',
  },
];

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  OfflineSyncService.instance
      .configureUrlBuilder((endpoint) => '$_baseUrl/api/$endpoint');
  await OfflineSyncService.instance.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cliente API — Examen SW1',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
        brightness: Brightness.light,
      ),
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

  // Voz
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _speechAvailable = false;
  bool _listening = false;

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
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    final available = await _speech.initialize(
      onError: (e) => debugPrint('Speech error: $e'),
    );
    if (mounted) setState(() => _speechAvailable = available);
  }

  Future<void> _toggleListening() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }
    setState(() => _listening = true);
    await _speech.listen(
      onResult: (result) {
        if (result.finalResult) {
          final words = result.recognizedWords.trim();
          setState(() {
            if (words.startsWith('{')) {
              jsonController.text = words;
            } else {
              jsonController.text = _wordsToJson(words);
            }
            _listening = false;
          });
        }
      },
      listenOptions: SpeechListenOptions(
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 4),
        localeId: 'es_BO',
      ),
    );
  }

  /// Convierte "nombre Carlos telefono 70012345" -> {"nombre":"Carlos","telefono":"70012345"}
  String _wordsToJson(String words) {
    final parts = words.split(RegExp(r'\s+'));
    final map = <String, String>{};
    for (var i = 0; i + 1 < parts.length; i += 2) {
      map[parts[i]] = parts[i + 1];
    }
    const encoder = JsonEncoder.withIndent('  ');
    return encoder.convert(map);
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
          'Sin conexion: el registro se guardo localmente y se enviara '
          'automaticamente cuando vuelvas a tener internet.',
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
    _speech.cancel();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Widget helpers
  // ---------------------------------------------------------------------------

  /// Fila de chips de preset — un tap rellena endpoint + JSON automáticamente.
  Widget _buildPresets() {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _presets.length,
        separatorBuilder: (_, _r) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          final p = _presets[i];
          return ActionChip(
            label: Text(p['label']!),
            avatar: const Icon(Icons.flash_on, size: 14),
            onPressed: () {
              endpointController.text = p['endpoint']!;
              jsonController.text = p['json']!;
              setState(() {});
            },
          );
        },
      ),
    );
  }

  /// Botón de micrófono animado.
  Widget _buildMicButton() {
    return Tooltip(
      message: _speechAvailable
          ? (_listening ? 'Detener dictado' : 'Dictar JSON por voz')
          : 'Microfono no disponible',
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _listening ? Colors.red.shade100 : Colors.indigo.shade50,
        ),
        child: IconButton(
          icon: Icon(
            _listening ? Icons.mic : Icons.mic_none,
            color: _listening ? Colors.red : Colors.indigo,
          ),
          onPressed: _speechAvailable ? _toggleListening : null,
        ),
      ),
    );
  }

  /// Diálogo para cambiar la URL base en tiempo de ejecución.
  /// Útil durante el examen para apuntar al Spring Boot generado sin recompilar.
  Future<void> _showUrlDialog() async {
    final ctrl = TextEditingController(text: _baseUrl);
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Configurar servidor'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'URL del Spring Boot generado:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 6),
            const Text(
              'Emulador Android:\nhttp://10.0.2.2:8080\n\n'
              'Celular fisico (misma WiFi):\nhttp://192.168.X.X:8080\n\n'
              'Flutter Web / misma PC:\nhttp://localhost:8080',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: ctrl,
              autofocus: true,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'URL base',
                hintText: 'http://10.0.2.2:8080',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final newUrl =
                  ctrl.text.trim().replaceAll(RegExp(r'/$'), '');
              if (newUrl.isNotEmpty) {
                setState(() => _baseUrl = newUrl);
                OfflineSyncService.instance
                    .configureUrlBuilder((ep) => '$_baseUrl/api/$ep');
              }
              Navigator.pop(ctx);
            },
            child: const Text('Guardar y reconectar'),
          ),
        ],
      ),
    );
    ctrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cliente API — Examen', style: TextStyle(fontSize: 16)),
            Text(
              _baseUrl,
              style: TextStyle(
                fontSize: 10,
                color: Colors.indigo.shade200,
                fontFamily: 'monospace',
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Cambiar URL del servidor',
            onPressed: _showUrlDialog,
          ),
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
            // ── Banner offline / sync ──────────────────────────────────────
            if (!online || pendingCount > 0)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 8),
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
                            ? 'En linea — sincronizando $pendingCount registro(s)...'
                            : showingCached
                                ? 'Sin conexion — mostrando datos guardados localmente'
                                    '${pendingCount > 0 ? ' ($pendingCount pendiente(s))' : ''}'
                                : 'Sin conexion',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            // ── PRESETS ────────────────────────────────────────────────────
            const Text(
              'Presets rapidos',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            _buildPresets(),
            const SizedBox(height: 10),

            // ── Endpoint ──────────────────────────────────────────────────
            TextField(
              controller: endpointController,
              decoration: const InputDecoration(
                labelText: 'Endpoint (ej: clientes, barberos, pedidos)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: loading ? null : fetchItems,
              icon: const Icon(Icons.download),
              label: const Text('Cargar lista (GET)'),
            ),
            const SizedBox(height: 10),

            // ── JSON con botón de voz ──────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextField(
                    controller: jsonController,
                    maxLines: 4,
                    style:
                        const TextStyle(fontFamily: 'monospace', fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'JSON para crear (POST)',
                      border: const OutlineInputBorder(),
                      filled: _listening,
                      fillColor: Colors.red.shade50,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: _buildMicButton(),
                ),
              ],
            ),

            // Leyenda de escucha activa
            if (_listening)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 2),
                child: Row(
                  children: [
                    const Icon(Icons.fiber_manual_record,
                        size: 10, color: Colors.red),
                    const SizedBox(width: 4),
                    Text(
                      'Escuchando... Di: "nombre Carlos telefono 70012345"',
                      style: TextStyle(
                          fontSize: 11, color: Colors.red.shade700),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: loading ? null : createItem,
              icon: const Icon(Icons.add),
              label: const Text('Crear (POST)'),
            ),
            const SizedBox(height: 8),

            if (loading) const LinearProgressIndicator(),
            if (error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                margin: const EdgeInsets.only(top: 4),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  error!,
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),
            const Divider(height: 20),

            // ── Lista de resultados ────────────────────────────────────────
            Expanded(
              child: items.isEmpty
                  ? const Center(child: Text('Sin datos cargados aun'))
                  : ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final raw = items[index];
                        final text = raw is Map<String, dynamic>
                            ? raw.entries
                                .where(
                                    (e) => e.value is! List && e.value is! Map)
                                .map((e) => '${e.key}: ${e.value}')
                                .join('   •   ')
                            : raw.toString();
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 3),
                          child: ListTile(
                            dense: true,
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
