# Sección 2. Registro del desarrollo (evidencia del proceso)

> Sección obligatoria del documento SDD del 2do Parcial. Todos los datos de
> esta sección salen del historial real del repositorio
> (`git log`) y de pruebas ejecutadas; las fechas son las de los commits.
> Donde dice *(Captura N)*, insertar la imagen indicada con su fecha visible.

---

## 2.1 Control de versiones y forma de trabajo

- **Repositorio:** `github.com/luisfernandoAngulo28/generador_diagrama_clases_uml`
  (Git + GitHub), con historial completo desde el inicio del proyecto.
- **Volumen:** **89 commits** entre el **30/08/2026** y el **17/10/2026** (hasta `b014a42`; 79 del 1er Parcial y 10 del 2do).
- **Ramas:**
  - El 1er Parcial se desarrolló sobre `main`.
  - El 2do Parcial se aisló en la rama **`feat/mongodb-autoria`** para no
    romper lo ya evaluado.
  - Esa rama se integra mediante el **Pull Request #1**, que GitHub reporta sin
    conflictos con `main`.
- **Convención de mensajes:** desde septiembre se usa *Conventional Commits*
  (`feat:`, `fix:`, `perf:`, `docs:`). Cada commit del 2do Parcial explica
  **qué** cambió y **por qué**.
- **Planificación:** `PLAN_EVOLUCION_2DO_PARCIAL.md` y
  `CONTEXTO_CLAUDE_2DO_PARCIAL.md` (cronograma de 4 semanas y checklist), y
  `PLAN_SEMANA1_MONGODB.md` (diseño de la migración antes de escribir código).

![Captura 1: historial de commits de la rama feat/mongodb-autoria en GitHub.](docs/documento_final/img/evidencias/github_commits.jpg){width=5.5in}

![Captura 2: el Pull Request #1, que integra los commits de feat/mongodb-autoria en main.](docs/documento_final/img/evidencias/github_pr1.jpg){width=5.5in}

---

## 2.2 Línea de tiempo del 1er Parcial (base del proyecto)

| Semana (ISO) | Fechas | Commits | Funcionalidades entregadas |
|---|---|---|---|
| W35 | 30 ago | 8 | Lienzo UML, generador Spring Boot, chat IA, colaboración en tiempo real (Socket.io), dictado por voz, foto de pizarra a diagrama, exportación XMI, plantilla Flutter |
| W36 | 31 ago – 06 sep | 56 | Documentación PUDS con 28 diagramas, validación y normalización del modelo, despliegue en AWS (Docker Compose), tests unitarios, tour de onboarding, estereotipos «enum», «abstract» e «interface», bloqueo por clase, deshacer/rehacer, plantillas tipo EA, autenticación JWT, notación UML 2.5, bitácora de cambios, adjuntos en S3, HTTPS con Let's Encrypt en DuckDNS, Swagger y Docker en el ZIP generado |
| W37–W38 | 12–20 sep | 4 | Plan B local: pila completa sin AWS e IA local con Ollama; reintento ante errores 503 de Gemini |
| W39 | 21–23 sep | 11 | Verificación de IA offline en dispositivo físico, estándar de codificación, métricas OO, diagramas de secuencia, BDD, mock API, gestión de usuarios, importación del XMI de Enterprise Architect |

---

## 2.3 Registro del 2do Parcial: plan vs. ejecución real

El cronograma planificado distribuía el trabajo en cuatro semanas (17/10 al
11/11). En la práctica, las cuatro etapas se implementaron y verificaron
el **17/10/2026**, como muestran las fechas de los commits. El tiempo restante
hasta la entrega queda para la documentación, el despliegue y el simulacro.

| Etapa del plan | Commit | Fecha | Funcionalidad implementada | Cómo se verificó |
|---|---|---|---|---|
| Preparación | `3ede0cd` | 17/10 | Plan del 2do Parcial, diagramas de actores y EMCU por ciclo | Revisión del plan |
| **Semana 1** — MongoDB, autoría y sesiones | `cfdd410` | 17/10 | Persistencia políglota (Mongo + PostgreSQL), autoría granular por clase, atributo y relación, bitácora estructurada, sesiones continuas, JWT en Socket.io, script de migración | 7 tests nuevos de autoría; migración real de 8 diagramas y 55 entradas de historial (idempotente); prueba E2E de las funciones del 1er Parcial: XMI de ida y vuelta, ZIP del generador, locks |
| Semana 1 (ajuste) | `803ab14` | 17/10 | nginx enruta `/sessions` | Pila Docker completa probada detrás de nginx |
| **Semana 2** — motor IA híbrido | `914167e` | 17/10 | `HybridAiProvider` (Ollama ↔ Gemini), System Prompt del moderador con contexto dual, `POST /ai/moderator/:id` | 12 tests (motor y prompt); preguntas reales teórica, de contexto, de seguimiento y de acción |
| Semana 2 (configuración) | `a53a264` | 17/10 | `AI_PROVIDER=hybrid` documentado | — |
| Semana 2 (rendimiento) | `679ed16` | 17/10 | Prompt lite para el modelo local; filtros deterministas | Medición de latencia en CPU (ver 2.4.2); 14 tests nuevos |
| Semana 2 (orden configurable) | `602a785` | 17/10 | `AI_HYBRID_ORDER` cloud-first/local-first; precalentamiento de Ollama | 4 tests nuevos; tres escenarios reales (ver 2.4.2) |
| **Semana 3** — chat grupal | `814d912` | 17/10 | `chat:send` / `chat:new-message` / `ai:status`, ChatPanel público con badge del proveedor, autoría en vivo en el inspector | Prueba en navegador con dos usuarios simultáneos (ver 2.4.3) |
| **Semana 4** — visor Flutter | `e5eeae3` | 17/10 | `UmlViewerScreen` de solo lectura con chat y notificaciones locales | `flutter analyze` sin problemas; versión web probada contra el backend; `flutter build apk --release` exitoso |
| Documentación | `b014a42` | 17/10 | Sección 1 del SDD (fundamentación teórica) | Cada afirmación referida a un archivo del código |
| Despliegue en AWS | `90f081a` | 17/10 | MongoDB en el VPS, migración y nueva Elastic IP | Dominio, TLS y WebSocket verificados en producción |
| Corrección en producción | `4daba22` | 17/10 | Renombres encadenados y confirmaciones ("sí, hazlo") | 8 tests nuevos; prueba real en producción (Capturas 6 y 12) |
| **Ejecutor configurable** | `d003cf8` | 18/10 | Interruptor por sala «IA edita el lienzo» / «IA solo sugiere» (`ai:settings`, `applyCanvasPolicy`) | 8 tests nuevos; prueba local con Ollama en ambos modos |

**Tamaño del cambio del 2do Parcial:** 94 archivos, **+8.673 / −252 líneas** (`348f1aa..b014a42`).

---

## 2.4 Evidencias de pruebas funcionales

### 2.4.1 Pruebas automatizadas

- **Backend:** **125 pruebas unitarias en 20 archivos, todas aprobadas**
  (`npx vitest run`, 18/10/2026; la Captura 3 muestra la corrida del 17/10,
  con 117, antes del interruptor configurable). Cubren el generador y sus plantillas,
  validación, XMI, autoría y bitácora (`authorship.util.spec.ts`), saneamiento
  del modelo, motor híbrido (`hybrid.provider.spec.ts`), prompt del moderador,
  detección de pedidos explícitos y validación de operaciones de la IA.
- **Frontend:** compilación TypeScript y build de Vite sin errores; linter sin
  advertencias nuevas.
- **Flutter:** `flutter analyze` sin problemas en el código nuevo; APK de
  release compilado.

![Captura 3: salida de `npx vitest run` en el backend: 19 archivos y 117 pruebas aprobadas.](docs/documento_final/img/evidencias/vitest_117.jpg){width=5.8in}

### 2.4.2 Motor de IA híbrido — mediciones reales (laptop del equipo, CPU)

| Escenario | Proveedor que respondió | Tiempo |
|---|---|---|
| `cloud-first` (por defecto) | Gemini Cloud | 4,3 s |
| Gemini falla → respaldo automático | Ollama Local | 13,5 s |
| `local-first`, modelo precalentado | Ollama Local | 5,0 s |
| Modelo local con el prompt completo (antes de optimizar) | Ollama Local | 36–79 s |
| Modelo local con prompt lite + caché (después) | Ollama Local | 5–18 s |

Comprobaciones de comportamiento del moderador:
- **Nombra a quien pregunta:** *"Trevor, un atributo derivado es…"*.
- **Contexto grupal:** respondió *"la clase Pedido fue creada por Marco…"*
  leyendo la bitácora.
- **Contexto individual:** *"como te comenté antes…"*.
- **Acción solo a pedido:** ante *"Agrega una clase Producto… muchos a muchos
  con Pedido"* propuso `CREATE_CLASS` + `MANY_TO_MANY`. Ante preguntas, cero
  operaciones.

![Captura 4: log del backend local (AI_HYBRID_ORDER=local-first) con el precalentamiento del modelo y los tiempos de cada respuesta de Ollama.](docs/documento_final/img/evidencias/ollama_log.png){width=6in}

![Captura 5: el Moderador IA responde con el modelo local (badge «🏠 Ollama Local»); en producción la misma vista muestra «☁️ Gemini Cloud» (Captura 6).](docs/documento_final/img/evidencias/ollama_badge.jpg){width=6in}

### 2.4.3 Prueba de colaboración con dos usuarios (navegador)

Dos sesiones simultáneas (Marco y Luis) sobre el mismo diagrama:
1. Luis pide a la IA crear `Producto` con relación N:M a `Pedido`.
2. La pestaña de Marco muestra en vivo *"La IA está pensando la respuesta
   para Luis"*, la respuesta *"Moderador IA → Luis"* y la clase nueva en su lienzo.
3. El inspector de Marco muestra *"Creada por Luis · vía IA"*.
4. La bitácora registra *"Luis: Creó la clase Producto (vía IA)"*, sin
   entradas falsas.
5. La barra indica **"2 conectados"**.

![Captura 6: chat público en producción. Fernando pide un cambio y el Moderador IA lo aplica en el lienzo ("3 cambios en el lienzo", Gemini Cloud).](docs/documento_final/img/evidencias/prod_moderador_cambios.jpg){width=6in}

![Captura 7: inspector de la clase Cliente con su autoría: creada por Luis y editada por Fernando vía IA, con los atributos agregados por el moderador.](docs/documento_final/img/evidencias/prod_inspector_autoria.jpg){width=6in}

### 2.4.4 Visor móvil en tiempo real

Con el visor Flutter abierto en el diagrama, Marco pidió desde la web
*"Agrega el atributo fecha de tipo LocalDate a Pedido"*. **Sin recargar**, el
móvil mostró:
- el atributo nuevo;
- el chat actualizado (de 2 a 4 mensajes);
- *"2 en la sala"*;
- en la hoja de detalle de `Producto`, *"Creada por: Luis · vía IA"*.

![Captura 8: visor Flutter en vista móvil (375×812): el diagrama en solo lectura con «2 en la sala» y la pestaña de chat con la respuesta del Moderador IA.](docs/documento_final/img/evidencias/flutter_visor.png){width=5.2in}

---

## 2.5 Registro de defectos encontrados y corregidos

Las pruebas con dos usuarios reales encontraron defectos que las pruebas
unitarias no veían. Este registro es evidencia de un proceso de verificación
efectivo.

| # | Defecto | Causa raíz | Corrección | Commit |
|---|---|---|---|---|
| 1 | Los mensajes WebSocket fallaban al unirse a la sala | El guard JWT global también interceptaba Socket.io (sin cabeceras HTTP) | El guard solo valida HTTP; la identidad del socket se toma del *handshake* | `cfdd410` |
| 2 | La ruta `/sessions` daba 404 en producción | nginx no la enrutaba al backend | Se agregó a la regla del proxy | `803ab14` |
| 3 | Respuesta de Ollama en 36–79 s | Prompt de 1.380 tokens en CPU (~50 tok/s) | Prompt lite + caché de prefijo + precalentamiento | `679ed16`, `602a785` |
| 4 | La IA local creaba clases que nadie pidió | El ejemplo few-shot de edición se colaba en el moderador | Ejemplos propios + filtro determinista de pedidos explícitos | `679ed16` |
| 5 | Una pestaña en segundo plano dejaba de sincronizar | El flag remoto se reseteaba con `requestAnimationFrame`, que no se ejecuta en pestañas ocultas | El flag se consume en el propio efecto de difusión | `814d912` |
| 6 | Las clases perdían su posición al recargar (defecto del 1er Parcial, desde `4198c8b`) | `PositionDto` sin decoradores: el `ValidationPipe` borraba `x`/`y` | Decoradores de validación + saneamiento del modelo | `814d912` |
| 7 | Entradas falsas en la bitácora ("modificó estereotipo…") | Mongo guardaba `undefined` como `null` | `sanitizeModel` + `ignoreUndefined` | `814d912` |
| 8 | El botón del visor quedaba cortado en celulares de 375 px | La AppBar no tenía espacio | Botón flotante "Visor UML en vivo" | `e5eeae3` |
| 9 | En producción la IA decía "renombré y agregué" pero el lienzo no cambiaba | El validador no seguía un renombre dentro del mismo lote, y "sí, hazlo" no contaba como pedido explícito | El validador sigue renombres y eliminaciones; se aceptan confirmaciones; si se descarta algo, la respuesta lo aclara | `4daba22` |
| 10 | En modo «solo sugerencias», el modelo local respondía "agregué la clase…" sin haberla agregado | El modelo pequeño ignora la instrucción del prompt | El servidor reescribe la respuesta con los pasos a seguir, generados desde las operaciones | `d003cf8` |

---

## 2.6 Trazabilidad requisito → código → prueba (insumo para V&V)

| Requisito del 2do Parcial | Implementación | Verificación |
|---|---|---|
| La IA nombra a quien responde | `moderator-prompt.ts` (regla 1) + `ensureAddressed()` | `moderator-prompt.spec.ts`; respuestas reales |
| Chat completamente público | `chat.gateway.ts` (difunde a toda la sala) | Prueba con dos usuarios |
| Mentor teórico y práctico | Prompt del moderador + operaciones + `intent.ts` | `intent.spec.ts`, `validate-operations.spec.ts` |
| Ejecutor **configurable** | `aiCanEditCanvas` en el diagrama + `ai:settings` + `canvas-policy.ts` | `canvas-policy.spec.ts`; prueba en ambos modos |
| Contexto grupal e individual | `moderator.service.ts` (bitácora, sala, hilo) | Respuestas "creada por Marco" / "como te comenté antes" |
| IA híbrida local + nube | `hybrid.provider.ts` | `hybrid.provider.spec.ts`; tres escenarios medidos |
| Autoría granular | `authorship.util.ts` | `authorship.util.spec.ts`; inspector y visor |
| Sesiones continuas | `sessions.service.ts` | E2E: pausa y reanudación con el mismo ID |
| Visor móvil en tiempo real | `flutter-template/lib/live/` | Prueba en vivo web → móvil; APK compilado |
| No romper el 1er Parcial | Rama aislada + interfaz de `DiagramsService` intacta | E2E de XMI, generador y locks |

---

## 2.7 Herramientas utilizadas y uso de asistencia de IA

- **Desarrollo:** Git y GitHub, Node.js 24, NestJS 12, React + Vite, Flutter 3.38,
  Docker Desktop, MongoDB 7, PostgreSQL 16, Ollama 0.40.
- **Asistente de programación:** el equipo trabajó con **Claude Code**
  (Anthropic) como asistente de programación. Por transparencia, los commits en
  que participó llevan la línea `Co-Authored-By: Claude` (82 de 89 commits). El
  equipo definió los requisitos y el plan, tomó las decisiones de diseño
  (persistencia políglota, orden del motor híbrido, alcance de cada semana),
  ejecutó las pruebas y revisó cada cambio antes de integrarlo.
- Todos los commits se hicieron desde la cuenta `luisfernandoAngulo28`.

---

## 2.8 Pendientes registrados (al 18/10/2026)

- [x] Desplegar en el VPS: levantar Mongo y correr una sola vez `migrate-pg-to-mongo.js` (17/10).
- [ ] Probar las notificaciones en un Android real (en web no se pudo conceder el permiso).
- [ ] Probar el corte de internet real (WiFi apagado) con `cloud-first`.
- [ ] Limitación conocida: el guardado reemplaza el modelo completo
  (*last-write-wins*), mitigado con locks por clase.
- [ ] Simulacro final con tres usuarios + visor móvil.
