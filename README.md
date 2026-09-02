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
| `flutter-template/` | App Flutter reutilizable para conectar en vivo contra cualquier backend generado (incluye el asistente 100% offline con `flutter_gemma`). |
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
npm test          # suite completa (vitest)
npm run test:e2e  # end-to-end
```

## Despliegue en producción

Ver [`deploy/README.md`](./deploy/README.md) para el despliegue en AWS EC2 con Docker Compose (backend + frontend + PostgreSQL en contenedores, Nginx como reverse proxy).

## Documentación del examen

Ver [`docs/`](./docs/): `Documentacion_del_Proyecto.docx` (fundamento teórico, arquitectura, PUDS, mecanismo del agente IA) y `Caso_Gestion_Ministerio_Salud.docx`.
