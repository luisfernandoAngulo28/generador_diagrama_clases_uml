// Chat 100% offline: corre completamente on-device con flutter_gemma
// (motor MediaPipe/LiteRT-LM de Google), sin ninguna llamada de red durante
// la conversación.
//
// El modelo NO se descarga en tiempo de instalación: el usuario selecciona
// un archivo .task ya descargado (ver README para el enlace de descarga).
// Esto evita depender de una descarga en vivo durante el examen.
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gemma/flutter_gemma.dart';

import 'offline_guard.dart';

class OfflineChatScreen extends StatefulWidget {
  const OfflineChatScreen({super.key});

  @override
  State<OfflineChatScreen> createState() => _OfflineChatScreenState();
}

class _ChatEntry {
  _ChatEntry(this.text, this.isUser);
  final String text;
  final bool isUser;
}

class _OfflineChatScreenState extends State<OfflineChatScreen> {
  final TextEditingController _inputController = TextEditingController();
  final List<_ChatEntry> _messages = [];

  InferenceChat? _chat;
  bool _installing = false;
  bool _generating = false;
  String? _modelFileName;
  String? _error;

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  Future<void> _pickAndLoadModel() async {
    setState(() {
      _error = null;
    });

    final result = await FilePicker.pickFiles(type: FileType.any);
    if (result == null || result.isEmpty) return;
    final picked = result.single;
    final path = picked.path;
    if (path == null) return;

    setState(() {
      _installing = true;
      _modelFileName = picked.name;
    });

    try {
      await FlutterGemma.initialize();
      await FlutterGemma.installModel(
        modelType: ModelType.qwen,
        fileType: ModelFileType.task,
      ).fromFile(path).install();

      final model = await FlutterGemma.getActiveModel(
        maxTokens: 1024,
        preferredBackend: PreferredBackend.cpu,
      );
      final chat = await model.createChat(
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        systemInstruction: kOfflineSystemPrompt,
      );

      setState(() {
        _chat = chat;
        _installing = false;
      });
    } catch (e) {
      setState(() {
        _error = 'No se pudo cargar el modelo: $e';
        _installing = false;
      });
    }
  }

  Future<void> _send() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _generating || _chat == null) return;

    setState(() {
      _messages.add(_ChatEntry(text, true));
      _inputController.clear();
      _generating = true;
    });

    // Filtro local: preguntas claramente ajenas ni siquiera tocan el modelo.
    if (!isOnTopic(text)) {
      setState(() {
        _messages.add(_ChatEntry(kOffTopicRefusal, false));
        _generating = false;
      });
      return;
    }

    try {
      await _chat!.addQuery(Message.text(text: text, isUser: true));
      final response = await _chat!.generateChatResponse();
      final reply = response is TextResponse ? response.token : '';
      setState(() {
        _messages.add(_ChatEntry(
          reply.isEmpty ? 'No obtuve respuesta del modelo.' : reply,
          false,
        ));
      });
    } catch (e) {
      setState(() {
        _messages.add(_ChatEntry('Error generando respuesta: $e', false));
      });
    } finally {
      setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Asistente 100% offline'),
        actions: [
          if (_chat != null)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Center(
                child: Text('🟢 Sin conexión', style: TextStyle(fontSize: 12)),
              ),
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_chat == null) ...[
              Text(
                'Selecciona el archivo del modelo (.task) que ya descargaste '
                '(ver README de esta plantilla para el enlace).',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                onPressed: _installing ? null : _pickAndLoadModel,
                icon: const Icon(Icons.folder_open),
                label: Text(
                  _installing
                      ? 'Cargando ${_modelFileName ?? "modelo"}…'
                      : 'Seleccionar modelo (.task)',
                ),
              ),
              if (_installing) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  padding: const EdgeInsets.all(8),
                  color: Colors.red.shade100,
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                ),
            ] else ...[
              Expanded(
                child: ListView.builder(
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final m = _messages[index];
                    return Align(
                      alignment: m.isUser
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.all(10),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.75,
                        ),
                        decoration: BoxDecoration(
                          color: m.isUser
                              ? Colors.indigo.shade100
                              : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(m.text),
                      ),
                    );
                  },
                ),
              ),
              if (_generating) const LinearProgressIndicator(),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        hintText: 'Pregunta de ingeniería de software…',
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _generating ? null : _send,
                    child: const Text('Enviar'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
