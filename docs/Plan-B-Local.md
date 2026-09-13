# Plan B — correr todo en tu laptop, sin depender de AWS

Para el caso de que el salón del examen no tenga WiFi/internet, o que la
red falle justo durante la defensa. Esto levanta la misma pila (Postgres
+ backend NestJS + frontend Nginx) **en tu propia laptop**, sin tocar ni
depender del servidor real de AWS.

**Probado en vivo en esta laptop** (2026-09-12): registro de usuario,
login, y creación de un diagrama real — los tres funcionando de punta a
punta contra `http://localhost`, sin internet.

## Qué SÍ funciona 100% sin internet

- Login / registro de usuarios.
- Crear, editar y guardar diagramas de clases.
- Colaboración en tiempo real (WebSockets) entre pestañas/dispositivos en
  la misma red local.
- Generar el backend Spring Boot a partir del diagrama.
- Import/export XMI.
- Bitácora de cambios.
- Formularios con datagrid (`FeaturesPanel`).

## Qué NO funciona sin internet (y no depende de dónde corra el backend)

- **Adjuntar documentos (S3)** — es una llamada a AWS S3. Sin internet,
  sin importar dónde corra el backend, esto **siempre** va a fallar.
- **Chat de edición de diagramas con IA — SÍ tiene un fallback local viable, ver abajo.** Voz y foto (Gemini) siguen sin cobertura local.

Si el profesor corta la conexión y pide ver TODO funcionando (incluida
la IA), la única forma de que eso siga funcionando es tener **algún**
tipo de internet — no necesariamente el WiFi del salón.

**Recomendación:** lleva tu celular con datos móviles como hotspot de
respaldo. Conecta la laptop a ese hotspot si el WiFi del salón falla, y
tanto la IA (Gemini) como S3 siguen funcionando con la app corriendo en
AWS como siempre — ni siquiera necesitas activar este Plan B local en
ese caso. Este Plan B local es específicamente para el escenario de
"cero internet en absoluto" (ni WiFi ni datos), donde solo puedes
demostrar la parte no-IA/no-S3 del proyecto.

## IA local (Ollama) para el chat del editor — SÍ es viable (con condiciones)

Se construyó soporte real para que el chat de edición de diagramas
(`/ai/edit`) hable con un **Ollama local** en vez de Gemini
(`AI_PROVIDER=ollama` en `docker-compose.local.yml`), reusando
exactamente el mismo esquema de operaciones atómicas
(`CREATE_CLASS`/`ADD_ATTRIBUTE`/`CREATE_RELATION`/etc. — ver
`backend/src/ai/prompts.ts`), para que el frontend no note diferencia.

**Primera ronda de pruebas (falló):** con la config por defecto de
Ollama (temperatura 0.8) y sin ejemplo en el prompt, tanto `gemma2:2b`
como `qwen2.5:1.5b-instruct` fallaban de forma consistente — formato
roto, atributos faltantes, y en un caso una relación inventada con una
clase ("Propietario") que nadie pidió.

**Tres arreglos concretos, no cosméticos:**
1. **`temperature: 0, top_p: 0.1`** en la llamada a Ollama — decodificación
   determinista en vez de creativa. Los modelos pequeños con temperatura
   por defecto improvisan contenido que no se les pidió; en modo
   determinista, no.
2. **Un ejemplo concreto (few-shot)** agregado al prompt (solo para
   Ollama, no toca el prompt de Gemini que ya funcionaba bien) — un
   modelo pequeño sigue un patrón mostrado mucho mejor que una regla
   abstracta.
3. **Red de seguridad en el servidor** (`backend/src/ai/validate-operations.ts`,
   aplica a CUALQUIER proveedor, incluido Gemini): descarta cualquier
   operación que referencie una clase que no existe en el modelo actual
   ni fue creada en el mismo batch — si el modelo alucina una relación
   con una clase inventada, esa operación nunca llega al diagrama.

**Segunda ronda de pruebas, con los tres arreglos — 3 de 3 correctas:**

| Caso | Tiempo total | Resultado |
|---|---|---|
| 1 clase, 2 atributos (`Cliente`: nombre, email) | 82 s | ✅ Exacto |
| 2 clases + relación (`Cliente`→`Pedido`, 1:N) | 59 s | ✅ Exacto, las 3 operaciones correctas |
| Modificar clase existente (`ADD_ATTRIBUTE telefono` a `Cliente`) | 32 s | ✅ Exacto |

**Detalle importante sobre el tiempo:** el costo alto (~60-80s) es
sobre todo procesar el prompt la PRIMERA vez; Ollama cachea ese
contexto, así que el segundo mensaje de la prueba compuesta reusó la
mayor parte del prompt de la anterior y su fase de "leer el prompt"
bajó de 61s a 1.7s. En la práctica esto significa: el primer mensaje de
una sesión es el lento, los siguientes son notablemente más rápidos.

**Recomendación actualizada: si vas a demostrarlo en vivo, "caliéntalo"
antes** — manda un mensaje cualquiera al asistente (modo Ollama) uno o
dos minutos antes de que el profesor mire, para pagar el costo del
primer prompt fuera de cámara. Aun así, sigue siendo notablemente más
lento que Gemini (30-80s por respuesta vs. 1-3s) — avísale al profesor
que es la versión "sin internet" y que por eso tarda más, en vez de
dejar que parezca que se colgó.

**Antes de confiar en esto para el examen, pruébalo tú mismo en la UI
real** (no solo en estas pruebas con curl): activa
`docker-compose.local.yml`, abre el chat del asistente, y prueba 2-3
mensajes variados con tus propios nombres de clase.

Si el resultado no es consistente en tus propias pruebas, la
alternativa de respaldo sigue siendo el asistente offline de
`flutter_gemma` en el celular (ver checklist, punto 4), que no necesita
seguir un esquema JSON exacto y por eso es inherentemente más robusto
para un modelo pequeño.

## Cómo levantarlo

Requiere Docker Desktop corriendo.

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --env-file .env.production up -d --build
```

Luego abre `http://localhost` en el navegador (o desde el celular en la
misma red local usando la IP de la laptop, ej. `http://192.168.1.X`).

## Cómo apagarlo

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml down
```

(`down` sin `-v` conserva los datos — la próxima vez que lo levantes,
tus diagramas de prueba siguen ahí.)

## Cómo funciona técnicamente

- `docker-compose.local.yml` es un *override* que se suma a
  `docker-compose.prod.yml` (no lo reemplaza, no lo modifica).
- Su único cambio: monta `frontend/nginx.local.conf` (HTTP puro, sin
  HTTPS) en vez del `nginx.conf` de producción, que exige el
  certificado real de Let's Encrypt — certificado que no existe en tu
  laptop y haría que Nginx no arrancara.
- `.env.production` en tu laptop es un archivo local con contraseñas de
  prueba (gitignored, nunca se sube) — no lleva las credenciales reales
  de AWS/Gemini.

## Antes del examen

Corre este comando **una vez, con anticipación** (no el día del examen)
para que las imágenes de Docker ya estén construidas y cacheadas
localmente — así, si tienes que activar el Plan B en el momento, solo
esperas unos segundos en vez de un build completo:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --env-file .env.production build
```
