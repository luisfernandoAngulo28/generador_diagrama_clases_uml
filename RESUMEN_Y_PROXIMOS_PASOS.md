# Resumen de Estado y Plan de Continuacion (Examen SW1)

**Fecha de ultima sesion:** 06 de Septiembre de 2026
**Objetivo:** Examen SW1 - 23 de Septiembre de 2026 (Nota meta: 100/100)

---

## COMPLETADO

### A. Simulacro Funcional Web (Caso Barberia)
- Se ejecuto el simulacro completo en vivo en https://diagramasw1pracial100.duckdns.org/
- Se crearon por IA las 4 entidades requeridas (Barbero, Cliente, Turno, Servicio)
- Se establecieron relaciones 1:N y N:M con atributos y tipos
- Se valido el flujo de generacion del backend en formato ZIP

### B. Generador Spring Boot: Swagger UI + Docker Compose
- OpenAPI 3 / Swagger UI integrado (springdoc-openapi-starter-webmvc-ui:2.6.0)
- Anotaciones @Tag y @Operation en todos los controladores generados
- docker-compose.yml (PostgreSQL 16 Alpine + Spring Boot) y Dockerfile multi-etapa
- README.md con instrucciones de arranque y lista de endpoints REST
- 57/57 tests de Vitest pasando en verde
- nest build al 100%

### C. [COMPLETADO 06/09/2026] Flutter Movil: Presets + Voz
- 6 botones de preset (Cliente, Barbero, Turno, Servicio, Producto, Pedido)
  - Un toque rellena endpoint Y JSON de prueba automaticamente
  - Evita escribir llaves, comillas, corchetes en el teclado tactil
- Boton de microfono (speech_to_text 7.4.0)
  - Dicta el JSON por voz: "nombre Carlos telefono 70012345" genera el JSON valido
  - Fondo rojo animado cuando esta escuchando
  - Locale: es_BO (Espanol Bolivia)
- Permisos Android: RECORD_AUDIO, INTERNET, BLUETOOTH_CONNECT en AndroidManifest.xml
- flutter pub get exitoso

---

## PENDIENTE

### 1. Despliegue al VPS (Swagger + Docker en produccion)
- Desplegar cambios al servidor VPS para que el ZIP generado traiga Swagger, Dockerfile y Docker Compose

### 2. Herramienta CASE Web - pequeños toques
- Boton de exportar imagen rapida del diagrama (PNG)
- Verificar candado de concurrencia en tiempo real

### 3. Chuleta para la Defensa Teorica
- Resumen ejecutivo de la licitacion del Ministerio de Salud
- 6 meses vs 12 meses, 100 ingenieros, entregables por fases

---

## Como retomar
> "Continuemos con el despliegue al VPS" o "Continuemos con el boton PNG del diagrama"