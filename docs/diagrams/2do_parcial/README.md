# Modelos UML del 2do Parcial (UML 2.5.1, OMG)

Todos los diagramas usan notación **UML 2.5.1** (Object Management Group, 2017)
y se escribieron en PlantUML a partir del código real. Cada archivo indica en
su cabecera qué archivos del código refleja (V&V: *lo que está en el código está
en los modelos*).

| # | Diagrama (tipo UML 2.5.1) | Qué modela | Refleja el código en |
|---|---|---|---|
| 01 | Despliegue | Nodos, entornos de ejecución, artefactos y rutas de comunicación (EC2 + Docker con MongoDB, PostgreSQL, nginx/TLS, Gemini, S3, Ollama) | `docker-compose.prod.yml`, `docker-compose.local.yml`, `frontend/nginx.conf` |
| 02 | Componentes | Módulos NestJS, frontend React y app Flutter con interfaces provistas (REST, Socket.io) y requeridas | `backend/src/*/…module.ts`, `frontend/src/api/`, `flutter-template/lib/live/` |
| 03 | Clases (datos) | Persistencia políglota y autoría granular embebida (`AuthorStamp`) | `backend/src/diagrams/schemas/`, `uml.types.ts`, entidades de PostgreSQL |
| 04 | Clases (diseño) | Motor IA híbrido (patrón Strategy) y Moderador grupal | `backend/src/ai/**` |
| 05 | Secuencia | Pregunta pública al Moderador IA (`alt` / `opt` / `par`: contexto dual y fallback Gemini ↔ Ollama) | `ChatPanel.tsx`, `chat.gateway.ts`, `moderator.service.ts`, `hybrid.provider.ts` |
| 06 | Secuencia | Guardado del diagrama con autoría granular, bitácora y difusión en vivo | `App.tsx` (`saveDiagram`), `diagrams.controller.ts`, `diagrams.service.ts`, `authorship.util.ts` |
| 07 | Máquina de estados | Sesión continua ACTIVE ⇄ PAUSED (pausar y reanudar otro día) | `sessions.service.ts`, `diagrams.gateway.ts` |
| 08 | Actividad | Decisión del motor híbrido: orden, circuit breaker, timeouts | `hybrid.provider.ts`, `ai.service.ts` |

Los modelos del 1er Parcial (casos de uso, EMCU por ciclo, colaboración y
secuencia por caso de uso) siguen en `docs/diagrams/`.

## Cómo regenerar los PNG

Con Java 17 y PlantUML (`plantuml-mit` 1.2026.9, desde Maven Central):

```bash
java -jar plantuml-mit.jar -charset UTF-8 -tpng docs/diagrams/2do_parcial/0*.plantuml
```

No requiere Graphviz: el estilo común (`_estilo.iuml`) usa el motor de layout
interno `smetana`.
