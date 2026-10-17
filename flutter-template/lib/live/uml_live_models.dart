// Modelos de solo lectura del diagrama UML en vivo (2do Parcial).
//
// El visor recibe el diagrama en dos formatos y los normaliza aquí:
//   - REST  GET /diagrams/:id      → modelo UML ({classes, relations})
//   - Socket 'diagram-update'      → nodos/aristas de React Flow del editor web

/// Quién creó / editó por última vez un elemento (lo asigna el servidor).
class AuthorStamp {
  final String userName;
  final DateTime? timestamp;
  final String? source; // MANUAL | AI | XMI_IMPORT | PHOTO

  const AuthorStamp({required this.userName, this.timestamp, this.source});

  static AuthorStamp? fromJson(dynamic json) {
    if (json is! Map) return null;
    final name = json['userName'];
    if (name is! String) return null;
    return AuthorStamp(
      userName: name,
      timestamp: DateTime.tryParse('${json['timestamp']}')?.toLocal(),
      source: json['source'] as String?,
    );
  }

  bool get viaAi => source == 'AI';
}

class UmlAttributeView {
  final String name;
  final String type;
  final String visibility;
  final bool isPrimaryKey;
  final AuthorStamp? author;

  const UmlAttributeView({
    required this.name,
    required this.type,
    required this.visibility,
    required this.isPrimaryKey,
    this.author,
  });

  factory UmlAttributeView.fromJson(Map json) => UmlAttributeView(
    name: '${json['name'] ?? ''}',
    type: '${json['type'] ?? ''}',
    visibility: '${json['visibility'] ?? 'private'}',
    isPrimaryKey: json['isPrimaryKey'] == true,
    author: AuthorStamp.fromJson(json['author']),
  );

  String get visibilitySymbol => switch (visibility) {
    'public' => '+',
    'protected' => '#',
    'package' => '~',
    _ => '-',
  };
}

class UmlClassView {
  final String id;
  final String name;
  final String? stereotype;
  final List<UmlAttributeView> attributes;
  final double x;
  final double y;
  final AuthorStamp? author;
  final AuthorStamp? lastModifiedBy;

  const UmlClassView({
    required this.id,
    required this.name,
    required this.attributes,
    required this.x,
    required this.y,
    this.stereotype,
    this.author,
    this.lastModifiedBy,
  });

  /// [fallbackIndex] ubica en grilla las clases sin posición guardada.
  factory UmlClassView.fromJson(
    Map json, {
    Map? position,
    int fallbackIndex = 0,
  }) {
    final pos = position ?? json['position'];
    final px = pos is Map ? pos['x'] : null;
    final py = pos is Map ? pos['y'] : null;
    final hasPos = px is num && py is num && px.isFinite && py.isFinite;
    return UmlClassView(
      id: '${json['id']}',
      name: '${json['name'] ?? '(sin nombre)'}',
      stereotype: json['stereotype'] as String?,
      attributes: [
        for (final a in (json['attributes'] as List? ?? const []))
          if (a is Map) UmlAttributeView.fromJson(a),
      ],
      x: hasPos ? px.toDouble() : 40.0 + (fallbackIndex % 3) * 240,
      y: hasPos ? py.toDouble() : 40.0 + (fallbackIndex ~/ 3) * 220,
      author: AuthorStamp.fromJson(json['author']),
      lastModifiedBy: AuthorStamp.fromJson(json['lastModifiedBy']),
    );
  }

  UmlClassView withAuthorship(Map? authorship) {
    if (authorship == null) return this;
    final attrAuthors = authorship['attributes'] is Map
        ? authorship['attributes'] as Map
        : const {};
    return UmlClassView(
      id: id,
      name: name,
      stereotype: stereotype,
      x: x,
      y: y,
      author: AuthorStamp.fromJson(authorship['author']) ?? author,
      lastModifiedBy:
          AuthorStamp.fromJson(authorship['lastModifiedBy']) ?? lastModifiedBy,
      attributes: [
        for (final a in attributes)
          UmlAttributeView(
            name: a.name,
            type: a.type,
            visibility: a.visibility,
            isPrimaryKey: a.isPrimaryKey,
            author:
                AuthorStamp.fromJson(
                  (attrAuthors[a.name] as Map?)?['author'],
                ) ??
                a.author,
          ),
      ],
    );
  }

  /// Contenido visible (sin posición): sirve para detectar qué clase cambió.
  String get contentKey =>
      '$name|$stereotype|${attributes.map((a) => '${a.name}:${a.type}:${a.visibility}').join(',')}';
}

class UmlRelationView {
  final String id;
  final String type;
  final String sourceId;
  final String targetId;

  const UmlRelationView({
    required this.id,
    required this.type,
    required this.sourceId,
    required this.targetId,
  });

  String get label =>
      const {
        'ASSOCIATION': 'Asociación',
        'AGGREGATION': 'Agregación',
        'COMPOSITION': 'Composición',
        'INHERITANCE': 'Herencia',
        'ONE_TO_ONE': '1 : 1',
        'ONE_TO_MANY': '1 : N',
        'MANY_TO_ONE': 'N : 1',
        'MANY_TO_MANY': 'N : M',
        'DEPENDENCY': 'Dependencia',
      }[type] ??
      type;
}

class UmlDiagramView {
  final String id;
  final String name;
  final List<UmlClassView> classes;
  final List<UmlRelationView> relations;

  const UmlDiagramView({
    required this.id,
    required this.name,
    required this.classes,
    required this.relations,
  });

  /// Desde REST: `{ id, name, model: { classes, relations } }`.
  factory UmlDiagramView.fromApi(Map json) {
    final model = json['model'] as Map? ?? const {};
    final classes = (model['classes'] as List? ?? const [])
        .whereType<Map>()
        .toList();
    return UmlDiagramView(
      id: '${json['id']}',
      name: '${json['name'] ?? 'Diagrama'}',
      classes: [
        for (var i = 0; i < classes.length; i++)
          UmlClassView.fromJson(classes[i], fallbackIndex: i),
      ],
      relations: [
        for (final r
            in (model['relations'] as List? ?? const []).whereType<Map>())
          UmlRelationView(
            id: '${r['id']}',
            type: '${r['type']}',
            sourceId: '${r['sourceClassId']}',
            targetId: '${r['targetClassId']}',
          ),
      ],
    );
  }

  /// Desde el socket: nodos y aristas de React Flow que emite el editor web.
  UmlDiagramView fromReactFlow(List nodes, List edges) {
    final classNodes = nodes
        .whereType<Map>()
        .where((n) => n['type'] == 'umlClass')
        .toList();
    return UmlDiagramView(
      id: id,
      name: name,
      classes: [
        for (var i = 0; i < classNodes.length; i++)
          if ((classNodes[i]['data'] as Map?)?['umlClass'] is Map)
            UmlClassView.fromJson(
              (classNodes[i]['data'] as Map)['umlClass'] as Map,
              position: classNodes[i]['position'] as Map?,
              fallbackIndex: i,
            ),
      ],
      relations: [
        for (final e in edges.whereType<Map>())
          UmlRelationView(
            id: '${e['id']}',
            type: '${(e['data'] as Map?)?['type'] ?? 'ASSOCIATION'}',
            sourceId: '${e['source']}',
            targetId: '${e['target']}',
          ),
      ],
    );
  }

  UmlDiagramView withAuthorship(Map authorship) => UmlDiagramView(
    id: id,
    name: name,
    relations: relations,
    classes: [
      for (final c in classes) c.withAuthorship(authorship[c.id] as Map?),
    ],
  );
}

/// Mensaje del chat grupal público (`chat:new-message`, `session:init-state`).
class ChatMessageView {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final bool isAi;
  final String? addressedTo;
  final String? providerUsed; // OLLAMA_LOCAL | GEMINI_CLOUD
  final int appliedOperations;
  final DateTime timestamp;

  const ChatMessageView({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.isAi,
    required this.timestamp,
    this.addressedTo,
    this.providerUsed,
    this.appliedOperations = 0,
  });

  factory ChatMessageView.fromJson(Map json) {
    final sender = json['sender'] as Map? ?? const {};
    return ChatMessageView(
      id: '${json['id'] ?? json['_id']}',
      senderId: '${sender['userId'] ?? ''}',
      senderName: '${sender['userName'] ?? '?'}',
      text: '${json['text'] ?? ''}',
      isAi: json['isAiResponse'] == true,
      addressedTo: (json['addressedTo'] as Map?)?['userName'] as String?,
      providerUsed: json['providerUsed'] as String?,
      appliedOperations: (json['appliedOperationsCount'] as num?)?.toInt() ?? 0,
      timestamp:
          DateTime.tryParse('${json['timestamp']}')?.toLocal() ??
          DateTime.now(),
    );
  }

  String? get providerBadge => switch (providerUsed) {
    'OLLAMA_LOCAL' => '🏠 Ollama Local',
    'GEMINI_CLOUD' => '☁️ Gemini Cloud',
    _ => null,
  };
}
