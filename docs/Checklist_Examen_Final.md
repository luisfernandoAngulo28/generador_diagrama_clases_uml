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

## 3. ¿Aplicación en producción cumpliendo factores de calidad? — ❌ Falta

Verificado: no hay carpeta `infra/`, `terraform/`, `.aws/` ni
`cloudformation` en el repo. `backend/.env.example` solo tiene
configuración de Postgres local y la API key de Gemini — cero referencias
a AWS. `docker-compose.prod.yml` es un stack self-hosted (Postgres +
backend + frontend con nginx), no apunta a ninguna infraestructura de AWS.
**Nada está desplegado todavía.** Esto es lo más urgente de la lista.

## 4. ¿IA con modelos locales? — ✅ Cumple (implementado) / ⚠️ (sin probar en dispositivo)

`flutter-template/pubspec.yaml` declara `flutter_gemma` (inferencia LLM
on-device, no una llamada a la nube). Está realmente conectado, no es
código muerto: `lib/offline_chat_screen.dart` implementa una pantalla
funcional (`FlutterGemma.initialize/installModel/createChat`) accesible
desde `main.dart` vía el botón "Asistente offline". Falta: probarlo en un
celular real con el modelo `.task` cargado.

## 5. ¿Documentación completa según Scrum + UML 2.5? — ⚠️ Parcial, con un problema urgente

- La sección de modelado UML 2.5+ existe (sección 4 del documento) y el
  resto de secciones (arquitectura, requisitos, diseño, implementación,
  manual de usuario) están escritas.
- **No hay ningún artefacto de Scrum** — se buscó "Scrum", "Sprint",
  "Backlog", "Retrospectiva", "Historia de usuario", "Product Owner" en
  todo el documento y no aparece ninguno. Si el docente pidió
  documentación "de acuerdo al Scrum", esto falta agregarlo (product
  backlog, sprints, alguna ceremonia).
- **Problema urgente y explícito del docente**: dijiste que el ingeniero
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

## 7. ¿S3 en AWS para documentos/imágenes? — ❌ Falta

Verificado con grep en todo `backend/src` y `package.json`: cero
referencias a `s3`, `aws-sdk`, `@aws-sdk` o `multer`. No existe ningún
mecanismo de subida de archivos en el backend todavía. Hay que decidir
qué se sube (¿fotos de pizarra ya capturadas por la IA? ¿adjuntos por
clase? ¿el PDF de documentación?) y agregar un endpoint + bucket S3.

## 8. ¿Documentación colaborativa con bitácora de quién modificó? — ❌ Falta

El `DiagramsGateway` solo tiene estado en memoria (no persistente): quién
está conectado ahora mismo y qué clase tiene bloqueada ahora mismo. No
existe una tabla de historial ni un campo que registre "quién cambió qué
y cuándo" — ni en el diagrama, ni en ningún documento. La entidad
`Diagram` solo tiene `createdAt`/`updatedAt`, sin autor. Para cumplir esto
necesitaríamos como mínimo: guardar el `userId` en cada `diagram-update`
y persistir un log de cambios consultable (quién, qué clase/relación,
cuándo).

## 9. ¿Está completa la documentación? — ⚠️ Parcial

Completa en estructura (perfil, requisitos, análisis, diseño,
implementación, manual de usuario, anexos), pero bloqueada por los puntos
5 (Scrum, diagramas de EA) y 8 (bitácora) de arriba.

---

## Resumen priorizado (qué atacar primero)

| # | Falta | Urgencia | Esfuerzo |
|---|---|---|---|
| 1 | Reemplazar las 2 imágenes de diagramas (4.3 y 6.3) por capturas reales de EA | 🔴 Alta — el docente lo pidió explícitamente | Bajo (lo haces tú en EA) |
| 2 | Desplegar en AWS (aunque sea una EC2 simple con el docker-compose que ya existe) | 🔴 Alta | Medio — necesitas la cuenta AWS |
| 3 | Agregar sección de Scrum a la documentación (backlog, sprints) | 🟡 Media | Bajo-medio |
| 4 | S3 para subir archivos | 🟡 Media | Medio |
| 5 | Bitácora de cambios (quién modificó qué) | 🟡 Media | Medio |
| 6 | Probar `flutter_gemma` y `offline_sync_service` en un celular real | 🟢 Baja (ya funciona en el emulador/build) | Bajo — solo necesitas el celular |

Los puntos 2, 4 y 5 (imágenes, ML, formularios/datagrid) del rúbrico ya
están cumplidos y verificados contra el código real.
