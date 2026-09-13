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

- **Chat/voz/foto con IA** (Google Gemini) — es una llamada a una API en
  la nube de Google. Sin internet, sin importar si el backend corre en
  AWS o en tu laptop, esta función **siempre** va a fallar.
- **Adjuntar documentos (S3)** — igual, es una llamada a AWS S3.

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
