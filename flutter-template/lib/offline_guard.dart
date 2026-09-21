// Filtro local + prompt de sistema para el asistente 100% offline.
//
// Validado primero fuera de Flutter (con el mismo modelo via Ollama) antes
// de portarlo aqui: un LLM de ~1-2B parametros es inconsistente siguiendo
// la restriccion de dominio por si solo, asi que se refuerza con un filtro
// de palabras clave que ni siquiera invoca al modelo para preguntas
// claramente ajenas a ingenieria de software.
library;

const List<String> kSoftwareEngineeringKeywords = [
  'uml', 'clase', 'clases', 'atributo', 'atributos', 'relacion', 'relación',
  'herencia', 'agregacion', 'agregación', 'composicion', 'composición',
  'asociacion', 'asociación', 'base de datos', 'tabla', 'entidad', 'entidades',
  'spring', 'boot', 'springboot', 'api', 'backend', 'arquitectura', 'capas', 'controlador',
  'servicio', 'repositorio', 'normalizacion', 'normalización', 'sql',
  'postgresql', 'diagrama', 'modelo', 'patron', 'patrón', 'java',
  'interfaz', 'multiplicidad', 'xmi', 'generador', 'codigo', 'código',
  'programacion', 'programación', 'software', 'desarrollo', 'sistema',
  'framework', 'endpoint', 'rest', 'json', 'git', 'testing', 'pruebas',
  'mvc', 'orm', 'jpa', 'hibernate', 'abstracta', 'metodologia', 'metodología',
  'puds', 'flutter', 'dart',
];

const String kOffTopicRefusal =
    'Solo puedo ayudarte con temas de ingeniería de software.';

const String kOfflineSystemPrompt =
    'Eres un asistente experto en ingenieria de software (UML, bases de '
    'datos, arquitectura, Spring Boot). Responde SIEMPRE en espanol, en '
    'maximo 2 o 3 oraciones breves y directas, sin listas largas ni '
    'encabezados. Ve directo al punto.';

/// True si el mensaje contiene al menos una palabra clave de ingeniería
/// de software (coincidencia de palabra completa, no subcadena).
bool isOnTopic(String message) {
  final lower = message.toLowerCase();
  for (final keyword in kSoftwareEngineeringKeywords) {
    final pattern = RegExp(
      r'\b' + RegExp.escape(keyword) + r'\b',
      caseSensitive: false,
    );
    if (pattern.hasMatch(lower)) return true;
  }
  return false;
}
