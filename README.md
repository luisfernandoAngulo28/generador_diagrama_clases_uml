# CASE Tool — Generador de backends Spring Boot desde UML

Herramienta web para dibujar diagramas de clases UML 2.5+, validarlos lógicamente,
generar a partir de ellos un backend Spring Boot completo (4 capas, JPA/Hibernate,
PostgreSQL), exportarlos a XMI (importable en Enterprise Architect) y colaborar
en tiempo real sobre el mismo diagrama. Incluye un asistente de IA (chat, voz,
foto-a-diagrama) restringido a temas de ingeniería de software.

## Estructura del repo

| Carpeta | Contenido |
|---|---|
| `backend/` | API NestJS + TypeORM + PostgreSQL: CRUD de diagramas, motor generador de código Spring Boot, exportación XMI, validación lógica/normalización, chat IA (Gemini), colaboración en tiempo real (Socket.IO). |
| `frontend/` | Canvas UML interactivo en React + Vite (`@xyflow/react`), panel de IA, panel de validación. |
| `flutter-template/` | App Flutter reutilizable para conectar en vivo contra cualquier backend generado (incluye presets, dictado por voz y modo offline). |
| `docs/` | Documentación del examen: fundamento teórico, caso de gestión, diagramas UML (`.mmd`/`.png`). |
| `deploy/` | Infraestructura de despliegue en AWS (EC2 + Docker Compose). Ver [`deploy/README.md`](./deploy/README.md). |
| `generated-out/`, `sim-frontend/` | Salidas de prueba de ejecuciones previas del generador (evidencia, no fuente). |

## Levantar el proyecto en local

Requisitos: Node.js 22+, PostgreSQL corriendo en `localhost:5432`.

### 1. Base de datos

Crear una base vacía (por defecto el backend espera `case_tool`, ver `backend/.env`).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # completar DB_* y GEMINI_API_KEY
npm run start:dev
```

Queda escuchando en `http://localhost:3000`. `DB_SYNCHRONIZE=true` por defecto: TypeORM crea el esquema automáticamente (no hay migraciones formales).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Por defecto apunta a `http://localhost:3000` (configurable con `VITE_API_URL`).

### 4. Tests

```bash
cd backend
npm test          # suite completa (vitest) — 57/57 en verde
npm run test:e2e  # end-to-end
```

## Despliegue en producción

Ver [`deploy/README.md`](./deploy/README.md) para el despliegue en AWS EC2 con Docker Compose (backend + frontend + PostgreSQL en contenedores, Nginx como reverse proxy).

**URL en producción:** https://diagramasw1pracial100.duckdns.org

## Documentación del examen

Ver [`docs/`](./docs/): `Documentacion_del_Proyecto.docx` (fundamento teórico, arquitectura, PUDS, mecanismo del agente IA) y `Caso_Gestion_Ministerio_Salud.docx`.

---

## 🎯 Examen SW1 — 23 de Septiembre de 2026

### Estado del proyecto (18/09/2026)

| Componente | Estado |
|---|---|
| Herramienta CASE Web (canvas + IA + colaboración) | ✅ 100% |
| Generador Spring Boot (4 capas + Swagger + Docker) | ✅ 98% |
| Flutter móvil (presets + voz + offline sync) | ✅ 85% |
| Parte teórica — caso gestión Ministerio de Salud | ✅ 90% |
| **Global** | **~93%** |

---

### ⏱️ ¿Cuánto dura el simulacro completo?

El simulacro replica exactamente lo que pedirá el profesor el día del examen:

| Paso | Actividad | Tiempo |
|---|---|---|
| 1 | Escuchar el sistema sorpresa del profesor (ej: Barbería, Restaurante) | ~1 min |
| 2 | Abrir la herramienta y crear las clases UML con IA por voz/chat | ~3 min |
| 3 | Establecer relaciones (1:N, N:M) con atributos y roles | ~2 min |
| 4 | Validar el diagrama (normalización, PKs, redundancias) | ~1 min |
| 5 | Generar el ZIP Spring Boot y descargar | ~1 min |
| 6 | Descomprimir ZIP y levantar con `docker compose up --build` | ~3 min |
| 7 | Verificar endpoints en Swagger UI (`/swagger-ui.html`) | ~1 min |
| 8 | Ajustar URL en Flutter y correr `flutter run` | ~2 min |
| 9 | Probar CRUD desde la app Flutter (presets + voz) | ~2 min |
| | **TOTAL** | **~15–20 min** |

> **Meta para el día del examen:** Completar todo en ≤ 15 minutos.  
> ⚠️ Practica el paso 6 con anticipación — el `mvn` puede tardar si no tiene caché local.  
> ⚠️ Si el profesor pide solo Flutter (sin Docker), ve directo al paso 8 usando la URL de producción.

---

### 🚀 Comandos rápidos para el día del examen

```powershell
# 1. Levantar el backend generado con Docker Compose
cd C:\ruta\al\zip\descomprimido
docker compose up --build
# → Swagger en http://localhost:8080/swagger-ui.html

# 2. Correr la app Flutter (emulador ya iniciado)
cd flutter-template
flutter run

# 3. Si usas celular físico en la misma red WiFi:
#    Edita _baseUrl en main.dart → http://<TU-IP-LAN>:8080
#    Obtén tu IP con: ipconfig
```

### 📋 Configuración de la app Flutter para el examen

El archivo [`flutter-template/lib/main.dart`](./flutter-template/lib/main.dart) tiene:
- **6 botones de preset** — un toque rellena endpoint + JSON automáticamente (evita escribir en el teclado táctil)
- **Botón micrófono** — dicta el JSON por voz: *"nombre Carlos telefono 70012345"* → JSON válido
- **URL configurable** desde la UI en tiempo de ejecución — no hace falta recompilar si cambias de red
- **Modo offline** — guarda las peticiones localmente y las sincroniza cuando vuelve la conexión
