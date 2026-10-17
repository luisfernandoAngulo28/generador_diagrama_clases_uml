import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'case_api.dart';
import 'live_notifications.dart';
import 'live_room.dart';
import 'uml_live_models.dart';

/// Visor UML en tiempo real (2do Parcial, Semana 4): el móvil se une a la
/// sala del diagrama y ve en vivo, en SOLO LECTURA, lo que el equipo modela
/// en la web y lo que conversa con el Moderador IA.
class UmlViewerScreen extends StatefulWidget {
  const UmlViewerScreen({super.key});

  @override
  State<UmlViewerScreen> createState() => _UmlViewerScreenState();
}

class _UmlViewerScreenState extends State<UmlViewerScreen> {
  final _api = CaseApi.instance;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _api.load().then((_) {
      LiveNotifications.instance.init();
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return _api.isLoggedIn
        ? _DiagramListPage(
            onLogout: () async {
              await _api.logout();
              setState(() {});
            },
          )
        : _LoginPage(onLoggedIn: () => setState(() {}));
  }
}

// ---------------------------------------------------------------------------
// Login contra la herramienta CASE (mismo usuario que en la web)
// ---------------------------------------------------------------------------
class _LoginPage extends StatefulWidget {
  const _LoginPage({required this.onLoggedIn});
  final VoidCallback onLoggedIn;

  @override
  State<_LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<_LoginPage> {
  final _api = CaseApi.instance;
  late final _url = TextEditingController(text: _api.baseUrl);
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.setBaseUrl(_url.text);
      await _api.login(_email.text, _password.text);
      widget.onLoggedIn();
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Visor UML en vivo')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Inicia sesión con tu cuenta de la herramienta CASE para ver en tiempo real el '
            'diagrama de tu equipo y el chat con el Moderador IA.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _url,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              labelText: 'URL de la herramienta CASE',
              helperText:
                  'Producción: https://diagramasw1pracial100.duckdns.org',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(
              labelText: 'Correo',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            autofillHints: const [AutofillHints.password],
            onSubmitted: (_) => _submit(),
            decoration: const InputDecoration(
              labelText: 'Contraseña',
              border: OutlineInputBorder(),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: _busy
                ? const SizedBox.square(
                    dimension: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.login),
            label: const Text('Entrar'),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Lista de diagramas
// ---------------------------------------------------------------------------
class _DiagramListPage extends StatefulWidget {
  const _DiagramListPage({required this.onLogout});
  final VoidCallback onLogout;

  @override
  State<_DiagramListPage> createState() => _DiagramListPageState();
}

class _DiagramListPageState extends State<_DiagramListPage> {
  final _api = CaseApi.instance;
  late Future<List<({String id, String name, DateTime? updatedAt})>> _future =
      _api.listDiagrams();

  void _reload() => setState(() => _future = _api.listDiagrams());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Diagramas del equipo'),
        actions: [
          IconButton(
            tooltip: 'Recargar',
            icon: const Icon(Icons.refresh),
            onPressed: _reload,
          ),
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: FutureBuilder(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorView(message: '${snapshot.error}', onRetry: _reload);
          }
          final diagrams = snapshot.data!;
          if (diagrams.isEmpty) {
            return const Center(child: Text('Aún no hay diagramas.'));
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              itemCount: diagrams.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final d = diagrams[i];
                return ListTile(
                  leading: const Icon(Icons.account_tree_outlined),
                  title: Text(d.name),
                  subtitle: d.updatedAt == null
                      ? null
                      : Text('Actualizado ${_formatDate(d.updatedAt!)}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => _LiveDiagramPage(diagramId: d.id),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Diagrama en vivo + chat (solo lectura)
// ---------------------------------------------------------------------------
class _LiveDiagramPage extends StatefulWidget {
  const _LiveDiagramPage({required this.diagramId});
  final String diagramId;

  @override
  State<_LiveDiagramPage> createState() => _LiveDiagramPageState();
}

class _LiveDiagramPageState extends State<_LiveDiagramPage> {
  LiveRoom? _room;
  String? _error;

  @override
  void initState() {
    super.initState();
    CaseApi.instance
        .getDiagram(widget.diagramId)
        .then((diagram) {
          if (!mounted) return;
          setState(() => _room = LiveRoom(diagram)..connect());
        })
        .catchError((Object e) {
          if (mounted) setState(() => _error = '$e');
        });
  }

  @override
  void dispose() {
    _room?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final room = _room;
    if (room == null) {
      return Scaffold(
        appBar: AppBar(),
        body: _error != null
            ? _ErrorView(
                message: _error!,
                onRetry: () => Navigator.pop(context),
              )
            : const Center(child: CircularProgressIndicator()),
      );
    }
    return ListenableBuilder(
      listenable: room,
      builder: (context, _) => DefaultTabController(
        length: 2,
        child: Scaffold(
          appBar: AppBar(
            title: Text(room.diagram.name),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Chip(
                  avatar: Icon(
                    Icons.circle,
                    size: 10,
                    color: room.connected ? Colors.green : Colors.grey,
                  ),
                  label: Text(
                    room.connected
                        ? '${room.connectedCount} en la sala'
                        : 'Reconectando…',
                  ),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ],
            bottom: TabBar(
              tabs: [
                const Tab(
                  icon: Icon(Icons.account_tree_outlined),
                  text: 'Diagrama',
                ),
                Tab(
                  icon: Badge(
                    isLabelVisible: room.thinkingFor.isNotEmpty,
                    child: const Icon(Icons.forum_outlined),
                  ),
                  text: 'Chat (${room.messages.length})',
                ),
              ],
            ),
          ),
          body: TabBarView(
            children: [
              _DiagramCanvas(room: room),
              _ChatView(room: room),
            ],
          ),
        ),
      ),
    );
  }
}

const double _boxWidth = 190;
const double _headerHeight = 34;
const double _rowHeight = 20;

double _boxHeight(UmlClassView c) =>
    _headerHeight + math.max(1, c.attributes.length) * _rowHeight + 10;

class _DiagramCanvas extends StatefulWidget {
  const _DiagramCanvas({required this.room});
  final LiveRoom room;

  @override
  State<_DiagramCanvas> createState() => _DiagramCanvasState();
}

class _DiagramCanvasState extends State<_DiagramCanvas> {
  final _transform = TransformationController();
  bool _fitted = false;

  LiveRoom get room => widget.room;

  /// Escala el diagrama completo para que quepa en la pantalla del celular.
  void _fit(Size viewport, double width, double height) {
    final scale = math.min(
      1.0,
      math.min(viewport.width / width, viewport.height / height),
    );
    _transform.value = Matrix4.diagonal3Values(scale, scale, 1);
  }

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classes = room.diagram.classes;
    if (classes.isEmpty) {
      return const Center(child: Text('El diagrama está vacío.'));
    }

    // Normaliza las coordenadas del editor web al origen del lienzo.
    final minX = classes.map((c) => c.x).reduce(math.min) - 40;
    final minY = classes.map((c) => c.y).reduce(math.min) - 40;
    final width =
        classes.map((c) => c.x + _boxWidth).reduce(math.max) - minX + 40;
    final height =
        classes.map((c) => c.y + _boxHeight(c)).reduce(math.max) - minY + 40;
    final rects = {
      for (final c in classes)
        c.id: Rect.fromLTWH(c.x - minX, c.y - minY, _boxWidth, _boxHeight(c)),
    };

    return Column(
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: room.lastEvent == null
              ? const SizedBox.shrink()
              : MaterialBanner(
                  key: ValueKey(room.lastEvent),
                  leading: const Icon(Icons.edit_note),
                  content: Text(room.lastEvent!),
                  actions: const [SizedBox.shrink()],
                ),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final viewport = constraints.biggest;
              if (!_fitted) {
                _fitted = true;
                _fit(viewport, width, height);
              }
              return Stack(
                children: [
                  Positioned.fill(
                    child: InteractiveViewer(
                      transformationController: _transform,
                      constrained: false,
                      minScale: 0.3,
                      maxScale: 2.5,
                      boundaryMargin: const EdgeInsets.all(200),
                      child: SizedBox(
                        width: width,
                        height: height,
                        child: Stack(
                          children: [
                            Positioned.fill(
                              child: CustomPaint(
                                painter: _RelationsPainter(
                                  relations: room.diagram.relations,
                                  rects: rects,
                                  color: Theme.of(context).colorScheme.outline,
                                  labelStyle: Theme.of(
                                    context,
                                  ).textTheme.labelSmall!,
                                ),
                              ),
                            ),
                            for (final c in classes)
                              Positioned.fromRect(
                                rect: rects[c.id]!,
                                child: _ClassBox(
                                  umlClass: c,
                                  highlighted: room.recentlyChanged.contains(
                                    c.id,
                                  ),
                                  lockedBy: room.locks[c.id],
                                  onTap: () => _showClassDetails(context, c),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 12,
                    bottom: 12,
                    child: FloatingActionButton.small(
                      heroTag: null,
                      tooltip: 'Ajustar a la pantalla',
                      onPressed: () => _fit(viewport, width, height),
                      child: const Icon(Icons.fit_screen),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Text(
            'Solo lectura · pellizca para hacer zoom · toca una clase para ver su autoría',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ],
    );
  }

  void _showClassDetails(BuildContext context, UmlClassView c) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Text(c.name, style: Theme.of(context).textTheme.titleLarge),
          if (c.stereotype != null) Text('«${c.stereotype}»'),
          const SizedBox(height: 8),
          _AuthorLine(label: 'Creada por', stamp: c.author),
          if (c.lastModifiedBy != null)
            _AuthorLine(label: 'Última edición', stamp: c.lastModifiedBy),
          const Divider(),
          for (final a in c.attributes)
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(
                '${a.visibilitySymbol} ${a.name}: ${a.type}${a.isPrimaryKey ? '  (PK)' : ''}',
              ),
              subtitle: a.author == null
                  ? null
                  : Text(
                      'agregado por ${a.author!.userName}${a.author!.viaAi ? ' · vía IA' : ''}',
                    ),
            ),
        ],
      ),
    );
  }
}

class _AuthorLine extends StatelessWidget {
  const _AuthorLine({required this.label, required this.stamp});
  final String label;
  final AuthorStamp? stamp;

  @override
  Widget build(BuildContext context) {
    final s = stamp;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Text(
        s == null
            ? '$label: sin registro (se asigna al guardar)'
            : '$label: ${s.userName}${s.viaAi ? ' · vía IA' : ''}'
                  '${s.timestamp == null ? '' : ' · ${_formatDate(s.timestamp!)}'}',
      ),
    );
  }
}

class _ClassBox extends StatelessWidget {
  const _ClassBox({
    required this.umlClass,
    required this.highlighted,
    required this.onTap,
    this.lockedBy,
  });

  final UmlClassView umlClass;
  final bool highlighted;
  final String? lockedBy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final c = umlClass;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: highlighted
                ? Colors.amber.shade700
                : (lockedBy != null ? scheme.tertiary : scheme.outline),
            width: highlighted || lockedBy != null ? 2.5 : 1,
          ),
          boxShadow: const [
            BoxShadow(
              blurRadius: 4,
              color: Color(0x22000000),
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: _headerHeight,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              decoration: BoxDecoration(
                color: scheme.primaryContainer,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(5),
                ),
              ),
              child: Text(
                lockedBy != null ? '${c.name}  ✏️ $lockedBy' : c.name,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: scheme.onPrimaryContainer,
                ),
              ),
            ),
            const SizedBox(height: 4),
            if (c.attributes.isEmpty)
              const SizedBox(height: _rowHeight)
            else
              for (final a in c.attributes)
                SizedBox(
                  height: _rowHeight,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      '${a.visibilitySymbol} ${a.name}${a.isPrimaryKey ? ' (PK)' : ''}: ${a.type}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

/// Dibuja cada relación como una línea entre los bordes de las dos cajas,
/// con su tipo (1 : N, Herencia, ...) en el punto medio.
class _RelationsPainter extends CustomPainter {
  _RelationsPainter({
    required this.relations,
    required this.rects,
    required this.color,
    required this.labelStyle,
  });

  final List<UmlRelationView> relations;
  final Map<String, Rect> rects;
  final Color color;
  final TextStyle labelStyle;

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = color
      ..strokeWidth = 1.4;
    for (final r in relations) {
      final a = rects[r.sourceId];
      final b = rects[r.targetId];
      if (a == null || b == null) continue;
      final start = _edgePoint(a, b.center);
      final end = _edgePoint(b, a.center);
      canvas.drawLine(start, end, line);
      _drawArrowHead(canvas, start, end, line);

      final painter = TextPainter(
        text: TextSpan(
          text: r.label,
          style: labelStyle.copyWith(color: color),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      final mid =
          Offset.lerp(start, end, 0.5)! -
          Offset(painter.width / 2, painter.height / 2);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          (mid & Size(painter.width, painter.height)).inflate(3),
          const Radius.circular(4),
        ),
        Paint()..color = const Color(0xF0FFFFFF),
      );
      painter.paint(canvas, mid);
    }
  }

  /// Punto donde la recta desde el centro de [rect] hacia [toward] cruza su borde.
  Offset _edgePoint(Rect rect, Offset toward) {
    final c = rect.center;
    final d = toward - c;
    if (d.dx == 0 && d.dy == 0) return c;
    final tx = d.dx == 0 ? double.infinity : (rect.width / 2) / d.dx.abs();
    final ty = d.dy == 0 ? double.infinity : (rect.height / 2) / d.dy.abs();
    return c + d * math.min(tx, ty);
  }

  void _drawArrowHead(Canvas canvas, Offset from, Offset to, Paint paint) {
    final angle = math.atan2(to.dy - from.dy, to.dx - from.dx);
    const size = 8.0;
    final path = Path()
      ..moveTo(to.dx, to.dy)
      ..lineTo(
        to.dx - size * math.cos(angle - 0.4),
        to.dy - size * math.sin(angle - 0.4),
      )
      ..moveTo(to.dx, to.dy)
      ..lineTo(
        to.dx - size * math.cos(angle + 0.4),
        to.dy - size * math.sin(angle + 0.4),
      );
    canvas.drawPath(path, paint..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(covariant _RelationsPainter old) =>
      old.relations != relations || old.rects != rects || old.color != color;
}

class _ChatView extends StatelessWidget {
  const _ChatView({required this.room});
  final LiveRoom room;

  @override
  Widget build(BuildContext context) {
    final me = CaseApi.instance.userId;
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Expanded(
          child: room.messages.isEmpty
              ? const Center(
                  child: Text('Todavía no hay mensajes en el chat del equipo.'),
                )
              : ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.all(12),
                  itemCount: room.messages.length,
                  itemBuilder: (context, i) {
                    final m = room.messages[room.messages.length - 1 - i];
                    final mine = !m.isAi && m.senderId == me;
                    return Align(
                      alignment: mine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 320),
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: m.isAi
                              ? scheme.tertiaryContainer
                              : (mine
                                    ? scheme.primaryContainer
                                    : scheme.surfaceContainerHighest),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.isAi
                                  ? '🤖 Moderador IA → ${m.addressedTo ?? 'la sala'}'
                                  : m.senderName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(m.text),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 6,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Text(
                                  _formatTime(m.timestamp),
                                  style: const TextStyle(fontSize: 11),
                                ),
                                if (m.providerBadge != null)
                                  Text(
                                    m.providerBadge!,
                                    style: const TextStyle(fontSize: 11),
                                  ),
                                if (m.appliedOperations > 0)
                                  Text(
                                    '✏️ ${m.appliedOperations} cambio(s)',
                                    style: const TextStyle(fontSize: 11),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
        for (final name in room.thinkingFor.values)
          ListTile(
            dense: true,
            leading: const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            title: Text('La IA está pensando la respuesta para $name…'),
          ),
        const Padding(
          padding: EdgeInsets.all(8),
          child: Text(
            'Chat público del equipo (solo lectura en el móvil)',
            style: TextStyle(fontSize: 12),
          ),
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    ),
  );
}

String _two(int n) => n.toString().padLeft(2, '0');
String _formatTime(DateTime d) => '${_two(d.hour)}:${_two(d.minute)}';
String _formatDate(DateTime d) =>
    '${_two(d.day)}/${_two(d.month)} ${_formatTime(d)}';
