# Resumen de Estado y Plan de Continuación (Examen SW1)

**Fecha de última sesión:** 20 de Septiembre de 2026  
**Objetivo:** Examen SW1 — 23 de Septiembre de 2026 (Nota meta: 100/100)

---

## 🏆 COMPLETADO Y VERIFICADO (100% FUNCIONAL)

### A. Despliegue al VPS (Producción en Vivo)
- ✅ Herramienta CASE completamente operativa en producción: **https://diagramasw1pracial100.duckdns.org**
- ✅ Autenticación JWT, chat de IA en tiempo real, persistencia de diagramas y validación de integridad activos.
- ✅ Backend en NestJS y Frontend en Next.js corriendo con certificados SSL válidos y Docker en el VPS.

### B. Generador Spring Boot: Swagger UI + Docker Compose
- ✅ OpenAPI 3 / Swagger UI integrado (`springdoc-openapi-starter-webmvc-ui:2.6.0`).
- ✅ Anotaciones `@Tag` y `@Operation` en todos los controladores REST generados.
- ✅ Generación de `docker-compose.yml` (PostgreSQL 16 Alpine + Spring Boot) y `Dockerfile` multi-etapa listos para correr.
- ✅ CORS habilitado (`@CrossOrigin(origins = "*")`) en todos los controladores para consumo directo desde Web y Móvil.

### C. Simulacro End-to-End Completo (Caso Restaurante)
- ✅ Se modeló por IA y manual el sistema de Restaurante (Mesas, Clientes, Pedidos, Productos).
- ✅ Se generó y descargó el ZIP de Spring Boot.
- ✅ Se levantó localmente con Docker Compose (PostgreSQL 16 + Spring Boot) en el puerto **8085**.
- ✅ Hibernate creó automáticamente las tablas relacionales y claves foráneas en PostgreSQL.

### D. App Móvil Flutter (Compilación APK Release + Conexión Real)
- ✅ **Resolución de errores de UI y Teclado:** Se corrigió el desbordamiento de pantalla (`BOTTOM OVERFLOWED BY PIXELS`) y la aserción de ciclo de vida (`_dependents.isEmpty`) implementando scroll dinámico universal (`SingleChildScrollView`).
- ✅ **Tráfico HTTP Local Permitido:** Habilitado `android:usesCleartextTraffic="true"` en `AndroidManifest.xml` para comunicación transparente con IPs locales (`http://192.168.X.X:8085`).
- ✅ **Firewall de Windows:** Se creó el script `abrir_puerto_8085.bat` para autorizar conexiones entrantes en Windows con 1 clic como Administrador.
- ✅ **APK Release Compilado:** Se generó el binario final optimizado (sin aserciones de depuración) ubicado en la raíz:
  - 📦 [`ExamenSW1.apk`](file:///d:/Universidad/SW1S22026/ExamenSW1/ExamenSW1.apk) (~281 MB con modelo Gemma y runtime nativo).
- ✅ **Prueba en Dispositivo Físico Exitosa:**
  - El celular se conectó vía Wi-Fi a `http://192.168.0.7:8085`.
  - Se probó **GET**: consultó exitosamente las mesas guardadas.
  - Se probó **POST**: se crearon los clientes `Carlos Mamani` (id: 1) y `Carlos Mendez` (id: 2) directamente desde el celular y se verificaron persistidos en la base de datos PostgreSQL de la PC.

---

## 📋 PROCEDIMIENTO RÁPIDO PARA EL DÍA DEL EXAMEN (23/09/2026)

```bash
# 1. EN LA HERRAMIENTA WEB (https://diagramasw1pracial100.duckdns.org):
#    - Crear el diagrama del enunciado del docente (manual o con chat IA).
#    - Clic en "Generar Spring Boot" y descargar el ZIP.

# 2. EN TU COMPUTADORA:
#    - Descomprimir el ZIP en una carpeta.
#    - Si el puerto 8080 está ocupado en tu PC, cambia en docker-compose.yml: "8085:8080"
#    - Abrir terminal en la carpeta y ejecutar:
docker compose up -d

# 3. CONECTAR TU CELULAR:
#    - Abrir cmd o powershell y ver tu IP Wi-Fi de ese momento:
ipconfig    # (anotar la Dirección IPv4, ej: 192.168.X.X)
#    - Si es una red nueva, ejecutar abrir_puerto_8085.bat como Administrador.
#    - En la app del celular, tocar el engranaje ⚙️ y colocar: http://<TU_IP>:8085

# 4. DEMOSTRACIÓN AL DOCENTE:
#    - Tocar el preset correspondiente (ej: Mesa, Cliente, etc.)
#    - Clic en "Crear (POST)" (o dictar por voz con el micrófono 🎙️)
#    - Clic en "Cargar lista (GET)" para ver los registros en pantalla.
```

---

## 📌 PENDIENTES MENORES (OPCIONALES)
1. **Chuleta / Resumen Teórico:** Repaso de los conceptos de la licitación del Ministerio de Salud (plazos 6 vs 12 meses, metodología ágil, equipo de desarrollo).