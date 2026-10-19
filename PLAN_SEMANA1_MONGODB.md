# Plan Semana 1 (17–23 Oct) — Migración a MongoDB + Autoría + Sesiones

> Basado en la revisión del backend actual (commit `348f1aa`).

## 1. Estado actual (lo que encontré)

| Pieza | Hoy | Observación |
|---|---|---|
| `Diagram` | PostgreSQL, `model` en columna **jsonb** | Ya es casi un documento: migra natural a Mongo. |
| `DiagramHistoryEntry` | Postgres, `summary` en texto libre (vía `summarizeModelDiff`) | Base de la futura bitácora, pero sin estructura (no se puede preguntar "¿qué hizo Marco?" con precisión). |
| `User`, `Attachment` | Postgres (TypeORM) | No necesitan flexibilidad documental. |
| `DiagramsService` | 80 líneas; lo usan `DiagramsController` y `GeneratorController` | Superficie pequeña → migración de bajo riesgo si se mantiene la misma firma pública. |
| `DiagramsGateway` | Locks y presencia **en memoria**; sin JWT (el nombre llega en `join-diagram`) | Para el chat grupal la IA necesita saber *quién* habla con certeza → JWT en el handshake. |
| Guardado | El frontend hace `PATCH /diagrams/:id` con **el modelo completo** (autosave con debounce) | La autoría se puede calcular **en el servidor** comparando modelo anterior vs nuevo, sin tocar el frontend. |
| IA | `AiService` elige UN proveedor por `AI_PROVIDER` (no hay fallback) | Se resuelve en la Semana 2 (`HybridAiProvider`). |

## 2. Decisión de arquitectura de datos (recomendada): **Persistencia políglota**

- **MongoDB** → `diagrams`, `diagram_sessions`, `diagram_activity_logs`, `group_chat_messages` (datos con forma de árbol, crecen con el uso, necesitan autoría embebida).
- **PostgreSQL se queda** → `users`, `attachments` (datos relacionales, con unicidad de email; ya funcionan).

Por qué: minimiza el riesgo sobre el 1er Parcial (login y adjuntos S3 no se tocan) y da un argumento fuerte para la **Sección "Arquitectura de Datos"**: cada dato vive en el motor que mejor se adapta a su forma (SQL para entidades relacionales, NoSQL para el modelo UML como documento).

> Alternativa: migrar todo a Mongo. Más trabajo (reescribir `UsersService`, `AttachmentsService`), sin beneficio para el examen.

## 3. Diseño de los esquemas (Mongoose)

**IDs:** se mantiene `_id` como **string UUID** (no `ObjectId`) para que las URLs del frontend, el XMI y el generador sigan funcionando igual y la migración de datos conserve los IDs actuales. Se expone como `id` en el JSON (transform de `toJSON`).

### `diagrams`
```ts
{ _id: uuid, name, model: UmlModel /* con autoría embebida */,
  createdBy: Author, lastModifiedBy: Author, createdAt, updatedAt }
// Author = { userId, userName, timestamp, source: 'MANUAL'|'AI'|'XMI_IMPORT'|'PHOTO' }
```
Autoría embebida = campos **opcionales** en `uml.types.ts`:
- `UmlClass.author?`, `UmlClass.lastModifiedBy?`
- `UmlAttribute.author?`
- `UmlRelation.author?`

Son opcionales → el generador Spring Boot, XMI y validación **los ignoran** sin cambios.

### `diagram_sessions`
`{ diagramId, status: ACTIVE|PAUSED|CLOSED, startedAt, lastActivityAt, participants[], activeLocks{} }`
- El gateway sigue usando el `Map` en memoria como fuente rápida y **persiste** (con debounce) en la sesión → al reconectar se restauran participantes/locks.
- `PAUSED` cuando sale el último participante; `ACTIVE` al volver a entrar.

### `diagram_activity_logs`
`{ diagramId, actor{userId,userName,type}, action, target{entityType,entityId,entityName}, details, timestamp }`
- Índice `{ diagramId: 1, timestamp: -1 }`.
- Reemplaza a `DiagramHistoryEntry`; `GET /diagrams/:id/history` sigue respondiendo (adaptado) para no romper el panel actual.

### `group_chat_messages`
`{ diagramId, sender{userId,userName,type}, text, isAiResponse, addressedTo, appliedOperationsCount, providerUsed, timestamp }`
- Índice `{ diagramId: 1, timestamp: 1 }`. Se crea ahora; se usa en Semanas 2–3.

## 4. Cómo se calcula la autoría (clave del diseño)

En `DiagramsService.update(id, dto, user)`:
1. Cargar el modelo anterior.
2. `diffModel(prev, next)` → lista estructurada: `CLASS_CREATED`, `CLASS_RENAMED`, `CLASS_DELETED`, `ATTRIBUTE_ADDED/REMOVED/CHANGED`, `RELATION_CREATED/DELETED` (evolución de `model-diff.util.ts`, que hoy devuelve solo texto).
3. **Fusionar autoría:** para cada clase/atributo/relación del modelo nuevo, conservar `author` del anterior (por `id` de clase/relación; por nombre de atributo dentro de la clase); si es nuevo → `author = usuario actual`; si cambió → `lastModifiedBy = usuario actual`. Así no importa si el frontend pierde estos campos al reconstruir el modelo desde React Flow.
4. Guardar el diagrama + insertar los logs estructurados (`insertMany`).

`source`: `MANUAL` por defecto; `AI` cuando el cambio venga de la IA (Semana 2), `XMI_IMPORT` en `import-xmi`.

## 5. Pasos de implementación (orden y verificación)

| # | Paso | Verificación |
|---|---|---|
| 0 | Commitear/guardar los cambios pendientes de `main`; crear rama `feat/mongodb-autoria` | `git status` limpio |
| 1 | `npm i @nestjs/mongoose mongoose` (versión compatible con Nest 12) | build ok |
| 2 | Servicio `mongo:7` en `docker-compose.prod.yml` (volumen + healthcheck) y `MONGO_URI` en backend; Mongo local para desarrollo | `docker compose up mongo` |
| 3 | `MongooseModule.forRootAsync` en `AppModule` **junto** a TypeORM | app arranca con ambos |
| 4 | Esquemas: `diagram.schema.ts`, `diagram-session.schema.ts`, `activity-log.schema.ts`, `group-chat-message.schema.ts` | — |
| 5 | Tipos de autoría opcionales en `uml.types.ts` | tests existentes del generador/XMI siguen verdes |
| 6 | `model-diff.util.ts` → diff estructurado + `mergeAuthorship()` con tests unitarios (vitest) | tests nuevos |
| 7 | Reescribir `DiagramsService` sobre Mongoose con **misma firma pública** | controller y `GeneratorController` sin cambios |
| 8 | `SessionsService` + `GET /sessions/:diagramId/latest`; gateway persiste sesión/locks | reconectar restaura estado |
| 9 | JWT en el handshake del socket (`io(url, { auth: { token } })`) → `client.data.user` | nombre real en presencia/locks |
| 10 | Script `scripts/migrate-pg-to-mongo.ts`: copia `diagrams` y `diagram_history_entries` conservando IDs | diagramas viejos abren igual |
| 11 | Quitar `Diagram`/`DiagramHistoryEntry` de TypeORM | — |
| 12 | Prueba de regresión 1er Parcial: crear/editar, XMI ida y vuelta, generar ZIP Spring Boot, locks con 2 navegadores | checklist completo |

## 6. Riesgos y mitigación

- **Romper el 1er Parcial** → rama aparte + misma interfaz de `DiagramsService` + paso 12 obligatorio antes de mergear.
- **Autosave frecuente genera muchos logs** → el diff solo registra cambios reales; ediciones de posición (`position`) no generan log.
- **Datos de producción en Postgres** → script de migración idempotente (upsert por `_id`), se corre una vez en el VPS antes de desplegar.
- **Memoria del VPS** → Mongo 7 con `--wiredTigerCacheSizeGB 0.25` si la instancia es pequeña.
