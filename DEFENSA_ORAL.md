# 🎤 Guion de Defensa Oral — Examen SW1 (Partes 3 y 4)

> Preparado contra el código real del proyecto. Léelo en voz alta hasta que
> las ideas salgan naturales. No memorices palabra por palabra: memoriza los
> **anclajes** (nombres de archivos, eventos, decisiones) y explica con tus
> palabras.

---

# 🟦 PARTE 3 — Verificación del desarrollo mediante metodología (PUDS)

**Qué evalúan:** que puedas *probar* que el software se construyó siguiendo
PUDS, tal como lo describe tu documentación (Parte II).

## 3.1 ¿Qué es PUDS y por qué lo usamos? (respuesta de 30 segundos)

> "PUDS es el Proceso Unificado de Desarrollo de Software, creado por 'los tres
> amigos' — Booch, Rumbaugh y Jacobson, los mismos que unificaron UML. Tiene
> tres características centrales: es **dirigido por casos de uso**, **centrado
> en la arquitectura** e **iterativo e incremental**. Lo elegimos porque
> nuestro proyecto es de modelado orientado a objetos, y PUDS integra
> naturalmente UML con el proceso: los casos de uso guiaron qué construimos y
> la arquitectura en capas guió cómo lo construimos."

## 3.2 Las 4 fases aplicadas a NUESTRO proyecto

| Fase | Qué se hizo en el proyecto |
|---|---|
| **Inicio** | Se definió el alcance: una herramienta CASE colaborativa que modela diagramas de clases, genera backend Spring Boot y exporta a Enterprise Architect. Se identificaron los actores (diseñador/usuario) y los casos de uso principales. |
| **Elaboración** | Se estableció la **arquitectura base**: frontend React Flow, backend NestJS por capas, PostgreSQL, WebSockets para colaboración. Se modeló el análisis (casos de uso detallados, diagramas de comunicación). Aquí ya hay **modelos y un prototipo arquitectónico ejecutable**, pero no el sistema completo. |
| **Construcción** | Se implementó el grueso: el motor generador de código, el chat de IA, los bloqueos de colaboración, la exportación XMI, la app Flutter. Iteración tras iteración se agregó funcionalidad probada. |
| **Transición** | Despliegue en producción (AWS/VPS con SSL), compilación del APK Release, pruebas end-to-end en dispositivo físico, y la documentación de usuario. |

## 3.3 Los flujos de trabajo (así lo documentamos en la Parte II)

PUDS aplica 5 flujos de trabajo que se repiten en cada iteración. Nuestra
documentación Parte II los recorre en orden:

1. **Requisitos** → Perfil, descripción del problema, actores y casos de uso.
2. **Análisis** → Análisis de arquitectura (paquetes) y de casos de uso
   (diagramas de comunicación).
3. **Diseño** → Diseño de clases, de la base de datos, de la arquitectura.
4. **Implementación** → El código real (generador, gateway, servicios).
5. **Pruebas** → Plan de pruebas, casos de prueba, pruebas de integración
   contra servicios reales (PostgreSQL, S3, Gemini) y producción.

> **Cómo probarlo si te lo piden:** "Abro mi documento en la sección Parte II y
> muestro que cada flujo tiene su capítulo con sus artefactos UML — no es
> teoría suelta, cada caso de uso del capítulo de Requisitos tiene su análisis,
> su diseño y su prueba correspondiente."

## 3.4 ⭐ PREGUNTA CERO (casi seguro que la hace)

> **"¿En la fase de elaboración se pueden tener modelos, pero no código?"**

**Respuesta:**
> "Sí. En la fase de Elaboración el foco está en la **arquitectura y los
> modelos** — casos de uso, análisis y diseño. Sí puede haber código, pero
> solo el de un **prototipo arquitectónico ejecutable** que valida que la línea
> base arquitectónica funciona y mitiga los riesgos técnicos. El grueso de la
> **implementación productiva** ocurre en la fase de **Construcción**, no en
> Elaboración. Entonces: modelos completos en Elaboración, sí; sistema
> codificado completo, no — eso es Construcción."

## 3.5 Otras preguntas típicas de PUDS

- **"¿Por qué 'dirigido por casos de uso'?"** → Porque los casos de uso son el
  hilo conductor: definen qué construir, guían el diseño y se convierten en los
  casos de prueba. Nada se implementa que no responda a un caso de uso.
- **"¿Qué significa 'centrado en la arquitectura'?"** → La arquitectura (las 4
  capas, la separación frontend/backend, la BD) se define temprano y estabiliza
  el desarrollo; todo lo demás crece sobre esa base.
- **"¿Iterativo e incremental?"** → Cada iteración produce un incremento
  funcional y probado. Ej.: primero el modelado UML, luego el generador, luego
  la colaboración, luego la IA — cada uno funcional antes de pasar al siguiente.
- **"¿Diferencia con Scrum?"** → PUDS es un proceso guiado por fases y flujos
  centrado en la arquitectura y los modelos; Scrum es un marco de gestión ágil.
  Documentamos **solo en términos de PUDS** por indicación del docente.

---

# 🟥 PARTE 4 — Defensa de autoría

**Qué evalúan:** que el código sea **tuyo**. El docente pedirá **modificar
algo, eliminar código, o desarrollar una funcionalidad pequeña EN VIVO.** Si
conoces tu arquitectura, esto es fácil. Aquí está tu mapa.

## 4.1 Mapa mental del proyecto (memoriza esto)

```
frontend/  → React + Vite + React Flow (el lienzo UML, paneles de IA/validación)
backend/   → NestJS, dividido en módulos:
   src/diagrams/    → CRUD de diagramas, gateway de colaboración, XMI
   src/generator/   → motor que genera el backend Spring Boot (templates/)
   src/ai/          → chat IA, interpretar-foto (Gemini)
   src/attachments/ → subida a S3
   src/auth/        → login JWT
flutter-template/ → app móvil (consume el backend, voz, offline, IA local)
```

## 4.2 Los 4 subsistemas que DEBES saber explicar

### A) Motor generador de código (`backend/src/generator/`)
- **Cómo funciona:** recibe el modelo de clases y, por cada clase, genera 4
  archivos Java usando plantillas en `templates/`:
  `entity.template.ts` (@Entity), `repository.template.ts` (JpaRepository),
  `service.template.ts` (lógica CRUD), `controller.template.ts` (REST).
- **Utilidades clave:** `java-type.util.ts` mapea tipos UML → Java (ej.
  `String`→`String`, `int`→`Integer`); `relations.util.ts` resuelve las
  relaciones (1:N, N:M) en anotaciones JPA.
- **Si te piden modificar:** "agrega el tipo `LocalDate`" → se toca
  `java-type.util.ts`. "Que el controller tenga un endpoint de conteo" → se
  toca `controller.template.ts`.

### B) ⭐ Colaboración en tiempo real (`backend/src/diagrams/*.gateway.ts`)
> Este es tu punto fuerte — responde directo al requisito de "exclusión y
> coordinación" que pidió el docente.
- **Cómo funciona:** un `@WebSocketGateway` con Socket.IO. Eventos:
  - `join-diagram` → el usuario entra a la sala del diagrama, se difunde su
    presencia.
  - `diagram-update` → los cambios se retransmiten a los demás en la sala.
  - `lock-class` / `unlock-class` → **control de exclusión**: cuando alguien
    edita una clase, se bloquea para los demás, evitando conflictos de edición
    simultánea. Esto es lo que hace la colaboración *segura*, no solo
    simultánea.
- **Frase para el docente:** "La naturaleza colaborativa exige controlar la
  exclusión mutua. Lo resolví con bloqueos a nivel de clase: mientras un
  usuario edita una clase, los demás la ven bloqueada, y al soltarla se
  libera y se sincroniza. Así tres usuarios pueden trabajar en el mismo
  diagrama sin pisarse."

### C) IA por operaciones atómicas (`backend/src/ai/`)
- **Cómo funciona:** el endpoint `/ai/edit` NO regenera el diagrama completo —
  devuelve **operaciones atómicas** (`CREATE_CLASS`, `ADD_ATTRIBUTE`,
  `CREATE_RELATION`) que se aplican sobre el modelo actual. `/ai/interpret-photo`
  recibe una foto de pizarra y devuelve clases/relaciones.
- **Frase:** "La IA asiste, no reemplaza: opera con cambios incrementales sobre
  el modelo del usuario, igual que pidió el enunciado."

### D) Interoperabilidad con Enterprise Architect (`backend/src/diagrams/xmi*.ts`)
- **Cómo funciona:** `xmi.util.ts` exporta el diagrama a formato **XMI**
  (estándar XML de OMG), importable en EA; `xmi-import.util.ts` hace lo inverso.
- **Frase:** "Usamos XMI, el estándar de intercambio de modelos de la OMG, para
  ir y volver desde Enterprise Architect sin reiniciar el trabajo."

## 4.3 Cambios pequeños que te pueden pedir (y cómo hacerlos rápido)

| Si te piden... | Dónde lo tocas |
|---|---|
| Soportar un tipo nuevo (ej. `LocalDate`, `BigDecimal`) | `generator/java-type.util.ts` |
| Que el backend generado tenga validación en un campo | `templates/entity.template.ts` (anotación `@NotNull`) |
| Un endpoint REST extra (ej. contar registros) | `templates/controller.template.ts` |
| Agregar una operación de IA nueva | `ai/ai.service.ts` (lista de operaciones atómicas) |
| Cambiar un color/estilo del lienzo | `frontend/src/` (componente del nodo) |
| Añadir un campo a una clase generada | Se hace desde la propia herramienta (Inspector de clase) y se regenera |

> **Regla de oro en vivo:** antes de tocar nada, **di en voz alta qué vas a
> hacer y dónde**. Ej: "Para agregar el tipo LocalDate voy a
> `java-type.util.ts`, agrego la entrada al mapa de tipos, y regenero." Eso
> demuestra autoría aunque tardes en teclear.

## 4.4 Preguntas trampa frecuentes

- **"¿Por qué NestJS y no Spring para tu herramienta?"** → NestJS da módulos,
  inyección de dependencias y WebSockets nativos con TypeScript, ideal para la
  colaboración en tiempo real; y Spring Boot es la *salida* que generamos, no la
  herramienta en sí.
- **"¿Qué pasa si dos usuarios editan la misma clase a la vez?"** → No pueden:
  el bloqueo por clase (`lock-class`) lo impide; el segundo la ve bloqueada.
- **"¿Cómo sé que el código generado compila?"** → Se validó end-to-end:
  generamos, compilamos con Maven y probamos cada endpoint. Los tests del
  generador (`generator.service.spec.ts`) verifican que el `pom.xml` incluye
  las dependencias correctas.
- **"Elimina esta función y muéstrame qué se rompe"** → Mantén la calma: borra,
  guarda, muestra el error de compilación/test, explica la dependencia, y
  restáuralo. Eso ES demostrar que entiendes tu código.

---

## ✅ Checklist mental antes de entrar

- [ ] Sé nombrar los 4 subsistemas y en qué carpeta está cada uno.
- [ ] Tengo lista la respuesta de la **pregunta cero** (elaboración = modelos).
- [ ] Puedo explicar el **bloqueo por clase** (exclusión colaborativa).
- [ ] Sé dónde agregar un **tipo de dato** y un **endpoint** en el generador.
- [ ] Puedo abrir mi **documentación Parte II** y señalar cada flujo PUDS.
- [ ] Respiro: si me piden tocar código, **primero digo qué haré y dónde**.
