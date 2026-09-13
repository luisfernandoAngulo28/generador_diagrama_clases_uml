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
- **Chat/voz/foto con IA (Gemini) — parcialmente cubierto, ver abajo.**

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

## IA local (Ollama) para el chat del editor — resultado real, no optimista

Se construyó soporte real para que el chat de edición de diagramas
(`/ai/edit`) hable con un **Ollama local** en vez de Gemini
(`AI_PROVIDER=ollama` en `docker-compose.local.yml`), reusando
exactamente el mismo esquema de operaciones atómicas
(`CREATE_CLASS`/`ADD_ATTRIBUTE`/`CREATE_RELATION`/etc. — ver
`backend/src/ai/prompts.ts`), para que el frontend no note diferencia.

**Se probó en vivo contra esta laptop (GPU integrada Intel UHD 620, sin
aceleración por hardware — solo CPU) con los modelos ya disponibles:**

| Modelo | Tiempo total | Resultado |
|---|---|---|
| `gemma2:2b` | ~205 s (3.4 min) | Formato roto: anidó la relación dentro del `CREATE_CLASS` en vez de como operación separada, y duplicó contenido en `reply`. |
| `qwen2.5:1.5b-instruct` (petición compuesta: 2 clases + relación) | ~40 s | No creó ninguna de las dos clases pedidas; solo alucinó una relación entre nombres que nunca definió. |
| `qwen2.5:1.5b-instruct` (petición simple: 1 sola clase con 2 atributos) | ~22 s | Creó la clase pero **sin los atributos pedidos**, y además **inventó una relación con una clase "Propietario" que nadie mencionó**. |

**Conclusión honesta: no es confiable, ni siquiera en el caso más
simple posible.** No es un problema de prompt — es que un modelo de
~1.5-2B parámetros corriendo por CPU pura, sin GPU, no sigue de forma
consistente un esquema JSON con varios campos anidados. Además, aun
cuando responde "bien" en velocidad (~20-40s), sigue siendo 10-20x más
lento que Gemini.

**Recomendación para el examen: no demuestres esta integración en
vivo.** El código queda en el repo (`AiProvider`, `GeminiProvider`,
`OllamaProvider` — arquitectura real e intercambiable, buena para
mostrar diseño si el ingeniero pregunta), pero el riesgo de que el
modelo invente una clase o relación que no pediste, en vivo, frente al
profesor, es real y ya ocurrió en las pruebas.

**La demostración confiable de "IA con modelo local" sigue siendo el
asistente offline de `flutter_gemma` en el celular** (ver checklist,
punto 4) — ese SÍ se probó y funciona, porque es una tarea mucho más
simple para un modelo pequeño (conversación libre en texto, sin tener
que producir una estructura JSON exacta con nombres de clases exactos
que coincidan con un modelo externo).

Si más adelante quieres reintentar esto con un modelo más grande
(7B+), vas a necesitar más tiempo por respuesta (varios minutos en esta
laptop) o una máquina con GPU dedicada — ninguna de las dos es viable
para una demo en vivo de 5-10 minutos.

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
