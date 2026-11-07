# Guía de cambios en vivo — Paso 4 de la defensa

En el Paso 4 el ingeniero verifica la autoría pidiendo **modificaciones en el
momento**, sobre **localhost**. Esta guía junta los cambios más probables, con
el archivo exacto, qué tocar y cómo probarlo. La idea es ensayar cada uno al
menos una vez antes del martes, **los dos**, y anotar el tiempo.

## 0. Preparación (antes de entrar)

1. Abrir **Docker Desktop** y esperar a que diga *Engine running*.
2. Abrir **Ollama** (si se va a mostrar la IA local).
3. Levantar la pila local, desde la raíz del repo:
   ```powershell
   docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --env-file .env.production up -d --build
   ```
   Se abre en **http://localhost**.
4. Abrir VS Code en la raíz del repo y una terminal en `backend/`.
5. Crear una rama para no ensuciar `feat/mongodb-autoria`:
   ```powershell
   git switch -c demo-en-vivo
   ```
6. Tener a mano: [GUIA_DEFENSA_2DO_PARCIAL.md](GUIA_DEFENSA_2DO_PARCIAL.md) y
   esta guía.

### Cómo mostrar un cambio

| Qué se cambió | Cómo se ve el cambio |
|---|---|
| Lógica del backend con test | `npx vitest run src/<carpeta>` (segundos) |
| Backend en la app | `docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --env-file .env.production up -d --build backend` y recargar el navegador (**medir el tiempo en el ensayo**) |
| Frontend | lo mismo con `frontend` en vez de `backend`, o `npm run dev` en `frontend/` para verlo al instante en http://localhost:5173 |
| Proyecto Spring Boot generado | *Archivo → Generar backend* y abrir el `.zip`; o mirar la vista previa de código |
| App Flutter | `flutter run -d chrome` en `flutter-template/` (recarga con `r`) |

**Regla de oro:** explicar en voz alta *dónde* va el cambio **antes** de
escribirlo. El ingeniero evalúa que conozcan el código, no la velocidad de
tipeo.

---

## 1. Agregar un tipo de dato al generador (ensayado: 27 s)

*"Quiero que el tipo `char` genere `Character` en Java."*

- **Archivo:** `backend/src/generator/java-type.util.ts`, objeto `TYPE_MAP`.
- **Cambio:** agregar la línea `char: 'Character',`.
- **Prueba:** crear `java-type.util.spec.ts` al lado:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { toJavaType } from './java-type.util.js';

  describe('toJavaType', () => {
    it('maps char to Character', () => {
      expect(toJavaType('char')).toBe('Character');
    });
  });
  ```
  y correr `npx vitest run src/generator`. **Ojo:** el proyecto usa **Vitest**,
  no Jest, y los imports llevan `.js`.
- **Para explicar:** todos los templates (entidad, DTO, Postman) pasan por
  `toJavaType`, así que un solo cambio llega a todo el proyecto generado.

## 2. Una regla nueva de validación del modelo

*"Que avise si una clase empieza con minúscula."*

- **Archivo:** `backend/src/diagrams/validation.util.ts`, función
  `checkStructuralIntegrity`, dentro del `for (const cls of model.classes)`.
- **Cambio:** copiar el formato de `NO_PRIMARY_KEY`:
  ```ts
  if (cls.name && /^[a-z]/.test(cls.name.trim())) {
    issues.push({
      severity: 'warning',
      code: 'CLASS_NAME_LOWERCASE',
      message: `La clase "${cls.name}" debería empezar con mayúscula (UpperCamelCase).`,
      classId: cls.id,
      className: cls.name,
    });
  }
  ```
- **Prueba:** `npx vitest run src/diagrams/validation`. En la app aparece en el
  panel de validación (**ValidationPanel**) después de reconstruir el backend.
- **Para explicar:** `severity: 'warning'` no bloquea la generación; `'error'`
  sí.

## 3. Cambiar cuándo se une una versión del historial

*"¿Y si quiero una versión cada 5 minutos en vez de 10?"*

- **Archivo:** `backend/src/diagrams/versions.service.ts`, constante
  `VERSION_MERGE_WINDOW_MS = 10 * 60 * 1000`.
- **Cambio:** `5 * 60 * 1000`.
- **Prueba:** `npx vitest run src/diagrams/versions` (6 tests). Siguen pasando
  sin tocarlos, porque usan la constante y no "10 minutos" fijos: buen punto
  para comentar.
- **Para explicar:** `extendsLastVersion()` une los guardados seguidos de la
  misma persona y la misma fuente; la IA y las restauraciones siempre crean
  versión propia.

## 4. Cambiar lo que genera una entidad JPA

*"Que la clave primaria use `GenerationType.SEQUENCE`"* o *"que los `String`
tengan `length = 150`"*.

- **Archivo:** `backend/src/generator/templates/entity.template.ts`.
- **Cambio:** buscar donde se escribe `@GeneratedValue` o `@Column` y editar el
  texto del template.
- **Prueba:** `npx vitest run src/generator/templates/entity` (hay que
  actualizar el `toContain(...)` del spec). Para mostrarlo: generar el backend
  desde la app y abrir la entidad en el `.zip`.
- **Para explicar:** la base de datos la crea **solo** Hibernate desde las
  entidades (`ddl-auto=update`); por eso un cambio en el template cambia la
  tabla (defecto 13 del registro).

## 5. Cambiar la semántica de una relación (OMT)

*"¿Qué pasa al borrar el todo en una agregación? ¿Y si quiero que borre?"*

- **Archivo:** `backend/src/generator/relations.util.ts`, función
  `oneToManyField(...)` y el caso de la agregación (`@OnDelete(SET_NULL)`).
- **Respuesta antes de tocar:** composición = `cascade ALL` + `orphanRemoval`
  (las partes mueren con el todo); agregación = la parte sobrevive, su FK queda
  en `NULL`; asociación = sin cascada.
- **Prueba:** `npx vitest run src/generator/relations`.

## 6. Cambiar el comportamiento del Moderador IA

*"Que la IA responda en menos de 3 líneas"* o *"que firme como 'Moderador'"*.

- **Archivo:** `backend/src/ai/prompts.ts` (las reglas del *system prompt*).
- **Cambio:** agregar una regla en el texto del prompt.
- **Prueba:** reconstruir el backend y preguntar en el chat de la sala. Para el
  modelo local, `npm run ollama:modelo` regenera el `Modelfile` de
  `moderador-uml` desde el código (`ollama-modelfile.ts`).
- **Para explicar:** **no se entrena** el modelo, se **configura** con el
  *system prompt* y el contexto (diagrama, bitácora, hilo de la persona).

## 7. Cambiar el tiempo de espera de la IA local (sin tocar código)

*"Si Ollama tarda, ¿cuándo pasa a Gemini?"*

- **Dónde:** variables `OLLAMA_TIMEOUT_MS` (20 s por defecto) y
  `AI_HYBRID_ORDER` (`cloud-first` / `local-first`), leídas en
  `backend/src/ai/ai.service.ts`.
- **Cambio:** en la terminal, `$env:AI_HYBRID_ORDER = "local-first"` y volver
  a levantar el backend; el chat muestra el badge del proveedor que respondió.

## 8. Un texto o dato nuevo en la app Flutter

*"Que el visor muestre otro título"* o *"que muestre la fecha de cada
diagrama"*.

- **Archivo:** `flutter-template/lib/live/uml_viewer_screen.dart`:
  - título: `AppBar(title: const Text('Visor UML en vivo'))`;
  - lista: `ListTile(title: Text(d.name), subtitle: ...)`.
- **Prueba:** `flutter analyze` y `flutter run -d chrome` (recarga con `r`).
- **Para explicar:** el visor es de solo lectura; escucha los eventos del
  socket en `live_room.dart` (`_onDiagramUpdate`, `_onAuthorship`, ...).

## 9. Un evento nuevo de Socket.io (el más largo)

*"Que todos vean un aviso cuando alguien entra a la sala."*

- **Backend:** `backend/src/diagrams/diagrams.gateway.ts`, en el
  `@SubscribeMessage('join-diagram')` (`handleJoin`), después de
  `client.join(diagramId)`, emitir al resto de la sala:
  `client.to(diagramId).emit('user-joined', { userName: client.data.editorName })`.
  Ya existe algo parecido: `broadcastPresence(diagramId)` actualiza la lista de
  conectados.
- **Frontend:** escuchar `user-joined` donde se manejan los otros eventos del
  socket y mostrar un toast.
- **Para explicar:** con sesión iniciada, el usuario sale del JWT validado en el
  *handshake* (`resolveSocketUser` en `socket-auth.ts`), no del `userName` que
  manda el cliente, así que no se puede suplantar. El `userName` del payload
  solo se usa para invitados.

---

## Si algo sale mal

- **Error de compilación:** leerlo en voz alta y corregirlo; es normal y el
  ingeniero valora que se entienda el error.
- **Se rompe la app:** `git stash` vuelve al estado anterior en un segundo.
- **No hay internet:** todo esto corre en localhost; para la IA,
  `AI_HYBRID_ORDER=local-first` con Ollama abierto.

## Registro del ensayo

| # | Cambio | Quién | Tiempo | Notas |
|---|---|---|---|---|
| 1 | Tipo `char` | Claude (prueba) | 27 s | Hay que usar Vitest |
| 1 | Tipo `char` | | | |
| 2 | Regla de validación | | | |
| 3 | Ventana de versiones | | | |
| 4 | Entidad JPA | | | |
| 5 | Relación OMT | | | |
| 6 | Prompt de la IA | | | |
| 7 | Orden IA híbrida | | | |
| 8 | Flutter | | | |
| 9 | Evento de socket | | | |
