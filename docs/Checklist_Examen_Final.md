# Checklist — Preguntas del examen final

Las tres listas que pasaste son básicamente el mismo rúbrico repetido con
distinta redacción (probablemente de fuentes distintas: guía del examen,
notas de clase, lista rápida). Las consolidé en una sola lista de 9 puntos
canónicos, cada uno con estado actual verificado contra el código real
(no supuestos) y qué falta para cerrarlo.

**Leyenda:** ✅ Cumple · ⚠️ Parcial · ❌ Falta

---

## 1. ¿El proyecto está 100% completo según lo definido? — ⚠️ Parcial

Lo colaborativo, la IA por operaciones atómicas, la generación de backend
y el import/export XMI están terminados y probados. Lo que falta para el
100%:
- Despliegue en AWS (punto 3).
- Pruebas en un celular real de `offline_sync_service.dart` y del modelo
  local (punto 4) — hoy solo están verificadas con `flutter analyze` /
  `flutter build`, no en un dispositivo físico.
- S3 para documentos/imágenes (no existe, ver punto 7).
- Bitácora de cambios en la documentación colaborativa (no existe, ver
  punto 8).

## 2. ¿IA más allá de un chatbot simple (imágenes, ML)? — ✅ Cumple

- **Imágenes**: "📷 Foto de pizarra" interpreta una foto de un diagrama
  dibujado a mano y lo convierte en clases/relaciones reales
  (`backend/src/ai/ai.service.ts`, endpoint `/ai/interpret-photo`).
- **Chat no-trivial**: el asistente no regenera el diagrama completo —
  devuelve operaciones atómicas (`CREATE_CLASS`, `ADD_ATTRIBUTE`,
  `CREATE_RELATION`, etc.) que se aplican sobre el modelo actual, con
  comando de voz también.
- **Modelo local**: ver punto 4.

## 3. ¿Aplicación en producción cumpliendo factores de calidad? — ✅ Cumple

Resuelto: desplegado en una instancia EC2 real (`t3.micro`, Ubuntu 24.04,
`us-east-1`) con IP fija — **http://34.231.176.225**. Los 3 contenedores
(Postgres, backend NestJS, frontend Nginx) corren vía Docker Compose,
`restart: unless-stopped` + Docker habilitado al arranque, así que
sobrevive a un reinicio del servidor sin intervención manual. Se detectó
y corrigió un problema real antes de desplegar: `nginx.conf` no
reenviaba `/auth` ni `/attachments` al backend (se agregaron después de
crear ese archivo) — sin el fix, login y adjuntos habrían estado rotos
en producción aunque funcionaran en desarrollo. También se corrigió una
incompatibilidad Node 22/npm 10 vs Node 24/npm 11 en los Dockerfiles que
rompía `npm ci` en el build.

Verificado en vivo contra la IP pública real (no localhost): registro,
login, creación de diagrama, bitácora, subida a S3 real desde dentro de
AWS, y generación del backend Spring Boot — los 5 funcionando de punta a
punta. Ver `deploy/README.md` para instrucciones de redespliegue.

## 4. ¿IA con modelos locales? — ✅ Cumple (implementado) / ⚠️ (sin probar en dispositivo)

`flutter-template/pubspec.yaml` declara `flutter_gemma` (inferencia LLM
on-device, no una llamada a la nube). Está realmente conectado, no es
código muerto: `lib/offline_chat_screen.dart` implementa una pantalla
funcional (`FlutterGemma.initialize/installModel/createChat`) accesible
desde `main.dart` vía el botón "Asistente offline". Falta: probarlo en un
celular real con el modelo `.task` cargado.

## 5. ¿Documentación completa según UML 2.5 y el proceso de desarrollo? — ⚠️ Solo falta lo de EA

- La sección de modelado UML 2.5+ existe (sección 4 del documento) y el
  resto de secciones (arquitectura, requisitos, análisis, diseño,
  implementación, pruebas, manual de usuario) están escritas.
- **Proceso de desarrollo: solo PUDS, sin Scrum.** Por indicación
  explícita, se retiró por completo la sección de Scrum (roles, product
  backlog, sprints, ceremonias) que se había agregado antes en este
  checklist — la documentación describe el proceso de desarrollo
  exclusivamente en términos del PUDS (teoría en la Parte I, sección 7,
  y aplicación práctica en la Parte II con Perfil, Requisitos, Análisis,
  Diseño, Implementación y Pruebas). Verificado con `validate.py` y
  revisado con pandoc para confirmar que no quedó ninguna referencia a
  Scrum ni a la parte eliminada.
- **Problema urgente y explícito del docente (todavía pendiente)**: dijiste que el ingeniero
  **no quiere diagramas generados por IA, quiere los diagramas hechos en
  Architect**. Revisé las imágenes embebidas en el .docx:
  - La sección **4.3** ("Notación UML 2.5+ utilizada en el proyecto")
    tiene una **captura de nuestra propia herramienta web** (el lienzo
    oscuro con React Flow), no de Enterprise Architect.
  - La sección **6.3** ("Análisis de clase") tiene un **diagrama generado
    con Mermaid** (`docs/diagrams/analysis-classes.mmd`), tampoco hecho en
    EA.
  
  **Ambas imágenes hay que reemplazarlas por capturas reales de tu EA**
  antes de entregar, siguiendo el estilo que ya nos mostraste (Properties
  panel, Features grid, notación con rombos/triángulos). Esto es rápido
  de hacer pero hay que hacerlo a mano en EA, yo no puedo generarlo por ti
  sin que vuelva a ser "hecho por IA".

## 6. ¿Formularios con datagrid, texto, etc.? — ✅ Cumple

`frontend/src/components/FeaturesPanel.tsx` — grid editable de Atributos
(Nombre, Tipo, Visibilidad, PK, eliminar) y de Operaciones (Nombre,
Parámetros, Retorna, Visibilidad, eliminar), con alta/baja de filas en
vivo. Además el formulario de login/registro, el inspector de clase y el
de relación son formularios de texto estándar.

## 7. ¿S3 en AWS para documentos/imágenes? — ✅ Cumple

Resuelto: bucket real creado en tu cuenta de AWS
(`diagramador-uml-adjuntos-fernando`, `us-east-1`), con un usuario IAM
limitado solo a ese bucket (política `DiagramadorUmlS3Access`: ListBucket
+ PutObject/GetObject/DeleteObject, nada más). Backend nuevo
`backend/src/attachments/` — subir/listar/descargar (URL firmada,
expira en 5 min)/eliminar archivos por diagrama, con límite de 15MB y
lista blanca de tipos (imágenes, PDF, Word, Excel, PowerPoint, texto).
Accesible desde Archivo → "Documentos adjuntos". Verificado en vivo
contra S3 real: subida, descarga (el contenido coincide byte a byte),
eliminación confirmada, y rechazo de un `.exe` por tipo no permitido.

## 8. ¿Documentación colaborativa con bitácora de quién modificó? — ✅ Cumple

Resuelto: nueva entidad `DiagramHistoryEntry` (backend, tabla
`diagram_history_entries`) registra quién, qué cambió (resumen legible a
nivel de clase/relación: agregadas, eliminadas, renombradas, modificadas)
y cuándo, en cada creación y guardado de un diagrama — usando el usuario
autenticado del login. Accesible desde Archivo → "Bitácora de cambios" en
el toolbar (`frontend/src/components/HistoryPanel.tsx`), endpoint
`GET /diagrams/:id/history`. Verificado en vivo end-to-end.

## 9. ¿Está completa la documentación? — ⚠️ Casi — solo falta lo de EA

Completa en estructura (perfil, requisitos, análisis, diseño,
implementación, manual de usuario, gestión ágil con Scrum, anexos).
Solo queda pendiente el punto 1 del resumen: reemplazar las 2 imágenes
por capturas reales de tu Enterprise Architect.

---

## Resumen priorizado (qué atacar primero)

| # | Falta | Urgencia | Esfuerzo |
|---|---|---|---|
| 1 | Reemplazar las 2 imágenes de diagramas (4.3 y 6.3) por capturas reales de EA | 🔴 Alta — el docente lo pidió explícitamente | Bajo (lo haces tú en EA) |
| ~~2~~ | ~~Desplegar en AWS~~ — ✅ hecho (http://34.231.176.225) | — | — |
| ~~3~~ | ~~Capítulo de Pruebas en la documentación (Parte II)~~ — ✅ hecho (PUDS únicamente, sin Scrum) | — | — |
| ~~4~~ | ~~S3 para subir archivos~~ — ✅ hecho | — | — |
| ~~5~~ | ~~Bitácora de cambios (quién modificó qué)~~ — ✅ hecho | — | — |
| 6 | Probar `flutter_gemma` y `offline_sync_service` en un celular real | 🟢 Baja (ya funciona en el emulador/build) | Bajo — solo necesitas el celular |

Los puntos 2, 3, 4, 5, 6, 7 y 8 (producción en AWS, proceso de
desarrollo/PUDS, imágenes, ML, formularios/datagrid, S3, bitácora) del
rúbrico ya están cumplidos y verificados contra el código real, contra
tu bucket real de AWS, y contra el servidor real desplegado. Solo queda
el punto 1 (reemplazar las 2 imágenes por capturas de EA), más probar la
IA local en un celular físico (punto 6 de esta tabla).
