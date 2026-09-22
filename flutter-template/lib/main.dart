import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:speech_to_text/speech_to_text.dart' show SpeechListenOptions;

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
// URL default: para Flutter Web en Chrome → localhost:8080
String _baseUrl = 'http://192.168.0.7:8085';
String get baseUrl => _baseUrl;

// ---------------------------------------------------------------------------
// Historial de requests (persistente con SharedPreferences)
// ---------------------------------------------------------------------------
const _kHistoryKey = 'request_history_v1';
const _kMaxHistory = 10;

// ---------------------------------------------------------------------------
// Presets del RESTAURANTE (simulacro) — ajusta el día del examen según
// las entidades que el profesor pida.
// ---------------------------------------------------------------------------
const List<Map<String, String>> _presets = [
  {
    'label': 'Mesa',
    'endpoint': 'mesas',
    'json': '{\n  "numero": 1,\n  "capacidad": 4\n}',
  },
  {
    'label': 'Cliente',
    'endpoint': 'clientes',
    'json': '{\n  "nombre": "Carlos Mamani",\n  "telefono": "70012345"\n}',
  },
  {
    'label': 'Pedido',
    'endpoint': 'pedidos',
    'json': '{\n  "fecha": "2026-09-23",\n  "total": 150.0\n}',
  },
  {
    'label': 'Producto',
    'endpoint': 'productos',
    'json': '{\n  "nombre": "Hamburguesa",\n  "precio": 45.0\n}',
  },
  // ---- Presets genéricos (útiles para cualquier sistema) ----
  {
    'label': 'Empleado',
    'endpoint': 'empleados',
    'json': '{\n  "nombre": "Ana Flores",\n  "cargo": "Vendedor"\n}',
  },
  {
    'label': 'Venta',
    'endpoint': 'ventas',
    'json': '{\n  "fecha": "2026-09-23",\n  "total": 200.0\n}',
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

  // Historial persistente de los últimos 10 requests enviados con éxito
  List<Map<String, String>> _history = [];

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
    _loadHistory();
  }

  // ─── Historial ────────────────────────────────────────────────────────────

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_kHistoryKey) ?? [];
    if (mounted) {
      setState(() {
        _history = raw.map((e) {
          final decoded = jsonDecode(e) as Map<String, dynamic>;
          return {
            'endpoint': decoded['endpoint'] as String,
            'json': decoded['json'] as String,
          };
        }).toList();
      });
    }
  }

  Future<void> _saveHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = _history.map((e) => jsonEncode(e)).toList();
    await prefs.setStringList(_kHistoryKey, raw);
  }

  Future<void> _addToHistory(String ep, String body) async {
    final entry = {'endpoint': ep, 'json': body};
    if (_history.isNotEmpty &&
        _history.first['endpoint'] == ep &&
        _history.first['json'] == body) return;
    setState(() {
      _history.insert(0, entry);
      if (_history.length > _kMaxHistory) {
        _history = _history.sublist(0, _kMaxHistory);
      }
    });
    await _saveHistory();
  }

  void _showHistory() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(
                children: [
                  const Icon(Icons.history, color: Colors.indigo),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Historial de requests',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (_history.isNotEmpty)
                    TextButton(
                      child: const Text('Limpiar',
                          style: TextStyle(color: Colors.red)),
                      onPressed: () async {
                        setState(() => _history = []);
                        await _saveHistory();
                        if (ctx.mounted) Navigator.of(ctx).pop();
                      },
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            if (_history.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'Aún no hay requests enviados.\nCrea registros con POST o PUT.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _history.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final h = _history[i];
                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 14,
                        backgroundColor: Colors.indigo.shade50,
                        child: Text('${i + 1}',
                            style: const TextStyle(
                                fontSize: 11, color: Colors.indigo)),
                      ),
                      title: Text(
                        '/${h["endpoint"]}',
                        style: const TextStyle(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.bold,
                            fontSize: 13),
                      ),
                      subtitle: Text(
                        h['json']!
                            .replaceAll('\n', ' ')
                            .replaceAll('  ', ' '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11),
                      ),
                      trailing: const Icon(Icons.north_west,
                          size: 16, color: Colors.indigo),
                      onTap: () {
                        endpointController.text = h['endpoint']!;
                        jsonController.text = h['json']!;
                        setState(() {});
                        Navigator.of(ctx).pop();
                      },
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
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

  // ─── Validación de JSON ───────────────────────────────────────────────────

  /// Retorna null si el JSON es válido, o un mensaje de error amigable.
  String? _validateJson(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return 'El cuerpo JSON no puede estar vacío.';
    try {
      final parsed = jsonDecode(trimmed);
      if (parsed is! Map) {
        return 'El JSON debe ser un objeto { ... }, no una lista o valor simple.';
      }
      return null; // OK
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Unexpected character')) {
        return '❌ JSON inválido: caracter inesperado.\nTip: ¿olvidaste una coma o una comilla?';
      }
      return '❌ JSON inválido: $msg';
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

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
    // #6 — Validar JSON antes de enviar
    final body = jsonController.text;
    final validationError = _validateJson(body);
    if (validationError != null) {
      setState(() => error = validationError);
      return;
    }

    setState(() {
      loading = true;
      error = null;
    });

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
      await _addToHistory(endpoint, body); // #10 — guardar en historial
      await fetchItems();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  // #2 — PUT: editar registro existente
  Future<void> _editItem(dynamic item) async {
    if (item is! Map<String, dynamic>) return;
    final id = item['id'];
    if (id == null) {
      _showSnack('Este registro no tiene campo "id", no se puede editar.');
      return;
    }
    final editableFields = Map<String, dynamic>.from(item)..remove('id');
    const encoder = JsonEncoder.withIndent('  ');
    final initialJson = encoder.convert(editableFields);
    final editCtrl = TextEditingController(text: initialJson);
    String? dialogError;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.edit, color: Colors.indigo, size: 20),
              const SizedBox(width: 8),
              Text('Editar — $endpoint #$id'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (dialogError != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Text(dialogError!,
                        style: TextStyle(
                            fontSize: 12, color: Colors.red.shade800)),
                  ),
                TextField(
                  controller: editCtrl,
                  maxLines: 8,
                  autofocus: true,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'JSON (sin el id)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancelar'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.save, size: 16),
              label: const Text('Guardar (PUT)'),
              onPressed: () async {
                final body = editCtrl.text;
                final err = _validateJson(body);
                if (err != null) {
                  setDialogState(() => dialogError = err);
                  return;
                }
                Navigator.of(ctx).pop();
                await _putItem(id, body);
              },
            ),
          ],
        ),
      ),
    );
    editCtrl.dispose();
  }

  Future<void> _putItem(dynamic id, String body) async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final url = '$listUrl/$id';
      final res = await http
          .put(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: body,
          )
          .timeout(const Duration(seconds: 6));
      if (res.statusCode >= 400) {
        throw Exception('HTTP ${res.statusCode}: ${res.body}');
      }
      await _addToHistory(endpoint, body); // #10 — guardar en historial
      _showSnack('✅ Registro #$id actualizado correctamente.');
      await fetchItems();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  // #2 — DELETE: eliminar registro existente
  Future<void> _deleteItem(dynamic item) async {
    if (item is! Map<String, dynamic>) return;
    final id = item['id'];
    if (id == null) {
      _showSnack('Este registro no tiene campo "id", no se puede eliminar.');
      return;
    }
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 22),
            SizedBox(width: 8),
            Text('Confirmar eliminación'),
          ],
        ),
        content: Text(
          '¿Seguro que deseas eliminar el registro #$id de "$endpoint"?\n\n'
          'Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.delete, size: 16),
            label: const Text('Eliminar'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final url = '$listUrl/$id';
      final res = await http
          .delete(Uri.parse(url))
          .timeout(const Duration(seconds: 6));
      if (res.statusCode >= 400) {
        throw Exception('HTTP ${res.statusCode}: ${res.body}');
      }
      _showSnack('🗑️ Registro #$id eliminado.');
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
    _showSnack(
      'Sin conexion: el registro se guardo localmente y se enviara '
      'automaticamente cuando vuelvas a tener internet.',
    );
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
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
        content: SingleChildScrollView(
          child: Column(
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
                'Celular fisico (misma WiFi):\nhttp://192.168.0.7:8085\n\n'
                'Flutter Web / misma PC:\nhttp://localhost:8085',
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
                  hintText: 'http://192.168.0.7:8085',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final newUrl =
                  ctrl.text.trim().replaceAll(RegExp(r'/$'), '');
              Navigator.of(ctx).pop();
              if (newUrl.isNotEmpty && mounted) {
                setState(() => _baseUrl = newUrl);
                OfflineSyncService.instance
                    .configureUrlBuilder((ep) => '$_baseUrl/api/$ep');
                fetchItems();
              }
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
          // #10 — Botón de historial con badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.history),
                tooltip: 'Historial de requests',
                onPressed: _showHistory,
              ),
              if (_history.isNotEmpty)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: 16,
                    height: 16,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: Colors.indigo,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${_history.length}',
                      style: const TextStyle(
                          fontSize: 9,
                          color: Colors.white,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
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
      body: SingleChildScrollView(
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
                    // #6 — Limpiar error de validación al editar
                    onChanged: (_) {
                      if (error != null &&
                          (error!.contains('JSON') ||
                              error!.contains('❌') ||
                              error!.contains('vacío'))) {
                        setState(() => error = null);
                      }
                    },
                    decoration: InputDecoration(
                      labelText: 'JSON para crear (POST)',
                      helperText: 'Formato: { "campo": valor }',
                      helperStyle: const TextStyle(fontSize: 10),
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
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: Text('Sin datos cargados aun')),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
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
                      // #2 — Botones EDITAR y ELIMINAR por cada registro
                      trailing: raw is Map<String, dynamic>
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Tooltip(
                                  message: 'Editar (PUT)',
                                  child: IconButton(
                                    icon: const Icon(Icons.edit,
                                        size: 18, color: Colors.indigo),
                                    onPressed:
                                        loading ? null : () => _editItem(raw),
                                  ),
                                ),
                                Tooltip(
                                  message: 'Eliminar (DELETE)',
                                  child: IconButton(
                                    icon: Icon(Icons.delete,
                                        size: 18,
                                        color: Colors.red.shade400),
                                    onPressed:
                                        loading ? null : () => _deleteItem(raw),
                                  ),
                                ),
                              ],
                            )
                          : null,
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
