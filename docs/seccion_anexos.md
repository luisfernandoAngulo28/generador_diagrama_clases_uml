# Anexos

> Sección de Anexos (cumple el punto obligatorio "Anexos" del enunciado).
> Insertar al final del documento, antes o después de la Bibliografía.
> Donde se indica *(Figura/Captura N)*, insertar la imagen correspondiente.
> Los datos entre ⟨corchetes⟩ deben completarse con la información del grupo.

## Anexo A. Evidencia del sistema en funcionamiento

Este anexo reúne la evidencia de que el sistema fue construido, desplegado y
verificado de extremo a extremo.

### A.1 Despliegue en producción

La herramienta se encuentra desplegada y operativa en un servidor accesible
públicamente, con certificado SSL válido (HTTPS):

- **URL de producción:** `https://diagramasw1pracial100.duckdns.org`
- **Infraestructura:** servidor en la nube con Docker Compose (contenedores de
  PostgreSQL, backend NestJS y frontend), con reinicio automático de los
  servicios y redirección de HTTP a HTTPS.
- **Almacenamiento en la nube:** los archivos adjuntos de los diagramas se
  respaldan en un *bucket* de Amazon S3.

*(Captura: sitio en producción respondiendo con candado de seguridad (HTTPS).)*

### A.2 Modelado y generación de código

*(Captura 1: interfaz principal del lienzo con un diagrama de clases.)*
*(Captura 2: edición de atributos y operaciones de una clase.)*
*(Captura 3: relaciones entre clases con multiplicidades.)*
*(Captura 7: código Java generado y la interfaz Swagger UI con los endpoints
CRUD.)*

### A.3 Colaboración en tiempo real

*(Captura 4: dos o más navegadores editando el mismo diagrama de forma
simultánea, mostrando la presencia de los usuarios conectados y el bloqueo por
clase.)*

### A.4 Asistencia por inteligencia artificial

*(Captura 5: asistente de IA generando clases por chat e interpretando una
fotografía de pizarra.)*

### A.5 Interoperabilidad con Enterprise Architect (XMI)

*(Captura 6: modelo importado/exportado en formato XMI dentro de Enterprise
Architect.)*

### A.6 Cliente móvil y IA local verificados en dispositivo físico

- **APK compilado (modo release):** `ExamenSW1.apk`.
- Se verificó en un teléfono Android real: la creación y el listado de registros
  contra el backend generado (operaciones GET y POST persistidas en PostgreSQL),
  el dictado por voz y el **asistente de IA local funcionando en modo avión**
  (sin conexión), con un modelo de lenguaje ejecutándose en el propio
  dispositivo.

*(Captura 8: aplicación móvil en funcionamiento y dictado por voz.)*

### A.7 Pruebas automatizadas

El backend cuenta con una suite de pruebas automatizadas (unitarias y de
integración) ejecutada con vitest, incluyendo pruebas específicas del motor
generador que validan que el proyecto Spring Boot producido sea correcto.

*(Captura: resultado de la ejecución de las pruebas en verde.)*

## Anexo B. Estándar de Codificación

El estándar de codificación aplicado en el proyecto —convenciones de
nomenclatura, estándares internacionales, stack tecnológico, herramientas de
calidad (oxlint, Prettier, TypeScript strict, vitest, flutter_lints),
configuración del entorno y métricas de calidad— se documenta de forma completa
en el anexo correspondiente.

> *(Insertar aquí el contenido del documento "Estándar de Codificación".)*

## Anexo C. Información del Grupo y Recursos del Proyecto

- **Materia:** Ingeniería de Software (SW1).
- **Docente:** Ing. Rolando Martínez Canedo.
- **Integrantes del grupo:** ⟨nombres y registros de los integrantes⟩.
- **Repositorio del código fuente:** ⟨URL del repositorio⟩.
- **Aplicación en producción:** `https://diagramasw1pracial100.duckdns.org`
- **Aplicación móvil (APK):** `ExamenSW1.apk`.
