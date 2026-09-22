# Anexo — Estándar de Codificación

## 1. Introducción

El presente estándar de codificación define las convenciones, herramientas y
prácticas aplicadas durante la construcción del proyecto, con el fin de
garantizar un código **legible, uniforme y mantenible** a través de las
distintas tecnologías que lo componen: el backend en TypeScript (NestJS), el
frontend en TypeScript (React), el cliente móvil en Dart (Flutter) y el código
Java (Spring Boot) producido por el motor generador. La adopción de un estándar
común reduce los errores de transcripción, facilita el trabajo colaborativo y
asegura la coherencia del producto final.

## 2. Estándares Internacionales Implementados

- **UML 2.5 (OMG):** notación estándar para el modelado de los diagramas de
  clases, base conceptual de toda la herramienta.
- **XMI 2.1 (OMG):** formato estándar de intercambio de modelos utilizado para
  la importación y exportación con herramientas externas como Enterprise
  Architect.
- **OpenAPI 3 / REST:** los endpoints generados siguen el estilo arquitectónico
  REST y se documentan según la especificación OpenAPI 3 (Swagger UI).
- **ISO/IEC 25010 (calidad del producto software):** atributos de mantenibilidad,
  portabilidad y fiabilidad tomados como referencia de calidad del sistema.
- **Convenciones de nomenclatura por lenguaje:**
  - TypeScript y Dart: `camelCase` para variables y funciones, `PascalCase`
    para clases, tipos y componentes.
  - Java (código generado): `PascalCase` para clases (`@Entity`, `Controller`,
    `Service`), `camelCase` para métodos y atributos, siguiendo las
    convenciones de Spring Boot.
  - Base de datos: nombres de tabla en `snake_case`
    (p. ej. `diagram_history_entries`).
- **Arquitectura en capas (separación de responsabilidades):** el backend
  generado respeta estrictamente el patrón Controlador → Servicio → Repositorio
  → Entidad.

## 3. Stack Tecnológico y Herramientas de Calidad

| Componente | Tecnología |
|---|---|
| Backend (herramienta CASE) | NestJS + TypeScript (modo `strict`), TypeORM, PostgreSQL |
| Frontend | React + Vite + TypeScript, React Flow |
| Cliente móvil | Flutter / Dart |
| Salida generada | Spring Boot 3.3.4, Java 17, Maven |

**Herramientas de aseguramiento de calidad:**

- **oxlint** — analizador estático (linter) del código TypeScript en backend y
  frontend, que detecta errores y malas prácticas antes de la ejecución.
- **Prettier** — formateador automático de código con configuración uniforme
  (comillas simples y coma final en estructuras multilínea), evitando
  discusiones de estilo y diffs ruidosos.
- **TypeScript en modo `strict`** — verificación estricta de tipos en tiempo de
  compilación, previniendo errores de tipo en backend y frontend.
- **vitest** — framework de pruebas unitarias y de integración del backend, con
  medición de cobertura (`@vitest/coverage-v8`) y pruebas end-to-end.
- **flutter_lints + `flutter analyze`** — conjunto de reglas de análisis
  estático oficial para el código Dart del cliente móvil.

## 4. Configuración del Entorno de Desarrollo

- **Requisitos:** Node.js 22+, PostgreSQL en `localhost:5432`, Flutter SDK.
- **Variables de entorno** (`.env`, nunca versionadas): credenciales de base de
  datos, `GEMINI_API_KEY` y `AI_PROVIDER` (para alternar entre IA en la nube y
  la IA local).
- **Comandos estandarizados** (backend):
  - `npm run start:dev` — ejecución en desarrollo con recarga en caliente.
  - `npm run lint` — análisis estático con oxlint.
  - `npm run format` — formateo automático con Prettier.
  - `npm test` / `npm run test:cov` — pruebas y cobertura con vitest.
  - `npm run test:e2e` — pruebas end-to-end.
- **Formateo automático al guardar** habilitado en el editor, para mantener el
  estilo sin intervención manual.

## 5. Flujo de Trabajo y Métricas

- **Control de versiones con Git:** cada avance se registra en commits con
  mensajes descriptivos y prefijos convencionales (`feat`, `fix`, `docs`), lo
  que permite trazar la evolución del proyecto.
- **Verificación previa a la integración:** antes de dar por válido un cambio se
  ejecutan el linter (oxlint / flutter analyze), el formateador y las pruebas
  automatizadas.
- **Métricas de calidad:**
  - Suite de pruebas del backend en verde (vitest), con medición de cobertura.
  - Verificación estricta de tipos (TypeScript `strict`) como red de seguridad
    en compilación.
  - Pruebas específicas del motor generador que validan que el `pom.xml` y las
    plantillas produzcan un proyecto Spring Boot correcto.
- **Revisión de código:** el conocimiento del código por parte de los autores se
  verifica en la defensa presencial (autoría), garantizando que cada
  componente sea comprendido y mantenible.

## 6. Conclusión

La aplicación de este estándar de codificación —soportado por herramientas
automáticas de análisis estático, formateo, verificación de tipos y pruebas—
asegura que el proyecto mantenga un nivel de calidad consistente a pesar de
combinar cuatro lenguajes y plataformas distintas. El estándar no es solo un
conjunto de recomendaciones: está **respaldado por herramientas que lo hacen
cumplir de forma automática**, reduciendo la deuda técnica y facilitando la
mantenibilidad y la evolución futura del sistema.
