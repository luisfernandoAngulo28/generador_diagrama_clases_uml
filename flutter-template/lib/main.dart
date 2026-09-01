import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'offline_chat_screen.dart';

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

void main() => runApp(const MyApp());

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

  List<dynamic> items = [];
  String? error;
  bool loading = false;

  String get listUrl => '$baseUrl/api/${endpointController.text.trim()}';

  Future<void> fetchItems() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await http.get(Uri.parse(listUrl));
      if (res.statusCode >= 400) {
        throw Exception('HTTP ${res.statusCode}: ${res.body}');
      }
      setState(() => items = jsonDecode(res.body) as List<dynamic>);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> createItem() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await http.post(
        Uri.parse(listUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonController.text,
      );
      if (res.statusCode >= 400) {
        throw Exception('HTTP ${res.statusCode}: ${res.body}');
      }
      await fetchItems();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    endpointController.dispose();
    jsonController.dispose();
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
