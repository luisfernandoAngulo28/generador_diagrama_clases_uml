# Guía de Usuario

> Sección lista para agregar a la documentación (cumple el punto obligatorio
> "Guías de usuario" del enunciado). Adaptada del manual de usuario del
> proyecto a un registro formal. Donde se indica *(Figura N)*, insertar la
> captura de pantalla correspondiente.

## 1. Introducción y Acceso al Sistema

El sistema permite a equipos de ingeniería de software diseñar diagramas de
clases UML de forma colaborativa y simultánea, asistidos por inteligencia
artificial, con sincronización móvil offline y generación automática de un
backend completo. El acceso puede realizarse por dos vías:

- **En producción (con certificado SSL):**
  `https://diagramasw1pracial100.duckdns.org`
- **En entorno local (desarrollo):** `http://localhost:3000` (frontend) y
  `http://localhost:8085` (API del backend).

Para ingresar, el usuario debe registrarse o iniciar sesión con sus
credenciales desde la pantalla de autenticación.

## 2. Entorno de Trabajo y Navegación Principal

Al acceder, el usuario visualiza el espacio de trabajo central, compuesto por un
lienzo infinito interactivo (implementado con React Flow) y una barra de
herramientas superior. Los elementos clave de la interfaz son:

1. **Barra superior:** controles de exportación (XMI), generación de código,
   acceso al asistente de IA e indicador de presencia de los usuarios conectados.
2. **Lienzo:** soporta desplazamiento (*pan*), acercamiento con la rueda del
   ratón y selección múltiple de clases.
3. **Barra de acciones rápidas:** creación de clases, auto-organización del
   diagrama y controles de zoom.

*(Figura 1: Interfaz principal del lienzo de trabajo.)*

## 3. Modelado Visual de Clases UML

### 3.1 Creación y edición de clases
1. Pulsar el botón **"Nueva Clase"** en la barra de herramientas; se colocará un
   bloque con valores por defecto.
2. Hacer doble clic sobre la clase para abrir el **editor de propiedades**, donde
   se definen: el **nombre** de la clase, un **estereotipo** opcional
   (`<<entity>>`, `<<service>>`, `<<abstract>>`), los **atributos** (nombre, tipo
   y visibilidad: `+` público, `-` privado, `#` protegido) y las **operaciones**
   (nombre, parámetros y tipo de retorno).

*(Figura 2: Formulario de edición de una clase.)*

### 3.2 Creación de relaciones entre clases
1. Situar el cursor sobre los conectores (puertos) en los bordes de la clase de
   origen.
2. Mantener presionado y arrastrar la línea hasta la clase de destino.
3. En el menú de la relación, seleccionar el **tipo** (asociación, agregación,
   composición, herencia/generalización o dependencia), las **multiplicidades**
   en ambos extremos (`1`, `0..1`, `*`, `1..*`) y, opcionalmente, el **rol**.

*(Figura 3: Relación entre clases con sus multiplicidades.)*

### 3.3 Auto-organización del diagrama
Cuando el diagrama tiene muchas clases desordenadas, el botón
**"Auto-Organizar"** aplica el algoritmo jerárquico Dagre, que calcula
automáticamente una distribución espacial legible y reduce el cruce de líneas.

## 4. Colaboración en Tiempo Real y Concurrencia

El sistema permite que varios usuarios editen el mismo modelo simultáneamente a
través de internet.

### 4.1 Invitar a un colaborador
1. Copiar la URL que contiene el identificador del diagrama (por ejemplo,
   `.../?diagram=ID_UNICO`).
2. Enviar el enlace a los demás integrantes.
3. Al ingresar, cada participante aparece identificado con su nombre y un color
   distintivo, indicando su presencia activa.

### 4.2 Sincronización instantánea
Los movimientos de nodos y la creación o modificación de clases, atributos y
relaciones se replican de inmediato a todos los participantes mediante
WebSockets.

### 4.3 Control de concurrencia (bloqueo por clase)
Para evitar que dos usuarios editen el mismo elemento a la vez, cuando un usuario
abre el editor de una clase el sistema emite el evento `lock-class`: la clase se
muestra bloqueada (con un indicador visual) para los demás usuarios, impidiendo
la sobreescritura. Al guardar o cancelar se emite `unlock-class`, liberando el
elemento y sincronizando el resultado.

*(Figura 4: Colaboración en tiempo real con varios usuarios.)*

## 5. Asistente de Diseño con Inteligencia Artificial

El sistema integra un asistente de IA para acelerar el diseño.

### 5.1 Generación incremental por chat
1. Abrir el **asistente de IA**.
2. Escribir una instrucción en lenguaje natural (por ejemplo, "agrega el módulo
   de gestión de pagos para los pedidos existentes").
3. La IA analiza las clases presentes y agrega las nuevas entidades, atributos y
   relaciones necesarias mediante operaciones incrementales, **sin borrar el
   trabajo previo**.

### 5.2 Interpretación de fotografías (visión artificial)
1. En el panel de IA, seleccionar la opción de **subir imagen**.
2. Cargar una fotografía de un diagrama de clases dibujado a mano.
3. El motor de visión procesa la imagen y transcribe el boceto a clases y
   relaciones interactivas en el lienzo.

*(Figura 5: Asistente de IA generando clases e interpretando una pizarra.)*

## 6. Interoperabilidad con Enterprise Architect (XMI 2.1)

El sistema implementa el estándar OMG XMI 2.1, con compatibilidad bidireccional
con herramientas CASE como Sparx Systems Enterprise Architect.

### 6.1 Exportar hacia Enterprise Architect
1. Pulsar **"Exportar XMI"**; se descarga un archivo `.xmi`.
2. En Enterprise Architect, sobre un paquete del *Project Browser*, elegir
   **Import/Export → Import Package from XMI** y seleccionar el archivo. Las
   clases, operaciones y relaciones aparecen nativamente en la herramienta.

### 6.2 Importar desde Enterprise Architect
1. En Enterprise Architect, exportar el paquete con **Export Package to XMI
   (versión 2.1)**.
2. En la aplicación web, pulsar **"Importar XMI"** y seleccionar el archivo; el
   sistema interpreta la estructura UML y dibuja las clases con auto-organización.

*(Figura 6: Botones de importación/exportación XMI y el modelo en Enterprise
Architect.)*

## 7. Generación Automática de Código (Spring Boot 3 + Docker)

A diferencia de los diagramadores convencionales, el sistema genera un backend
completo y ejecutable.

### 7.1 Generar y ejecutar
1. Con el diagrama terminado, pulsar **"Generar Código"**; el navegador descarga
   un archivo comprimido con el proyecto.
2. El proyecto sigue la arquitectura en cuatro capas (Entity, Repository,
   Service, Controller) sobre Java 17 y Spring Boot 3.3.4, e incluye `Dockerfile`
   y `docker-compose.yml` con PostgreSQL 16, además de una colección Postman y
   los scripts `schema.sql` y `data.sql`.
3. En una terminal, dentro de la carpeta del proyecto, ejecutar:
   `docker compose up -d`. El contenedor compila el código, levanta PostgreSQL,
   crea las tablas según el diagrama y expone los endpoints.

### 7.2 Probar la API
Abrir `http://localhost:8080/swagger-ui.html` para visualizar y probar en vivo
los endpoints CRUD (GET, POST, PUT, DELETE) generados para cada clase.

*(Figura 7: Código Java generado y la interfaz Swagger UI activa.)*

## 8. Uso de la Aplicación Móvil (Android / Flutter)

La solución incluye un cliente móvil con enfoque *offline-first*, que permite
trabajar incluso sin conexión a internet.

### 8.1 Instalación
1. Copiar el archivo `ExamenSW1.apk` al teléfono Android.
2. Abrirlo e instalar (habilitando "orígenes desconocidos" si el sistema lo
   solicita).

### 8.2 Configuración de la conexión
1. Pulsar el ícono de **ajustes de conexión**.
2. Ingresar la dirección del servidor: la IP local (por ejemplo,
   `http://192.168.0.7:8085`) o la URL pública en la nube.
3. Pulsar **"Probar conexión"** para confirmar la comunicación.

### 8.3 Creación de registros mediante comandos de voz
1. Pulsar el botón del **micrófono**.
2. Dictar la instrucción (por ejemplo, "crear cliente con nombre y teléfono").
3. El motor de reconocimiento de voz transcribe el comando, registra la
   información en el **almacenamiento local** del dispositivo y la sincroniza con
   el servidor central cuando hay conexión.

### 8.4 Asistente de IA local (sin conexión)
La aplicación incluye un asistente que ejecuta un modelo de lenguaje
directamente en el dispositivo, permitiendo realizar consultas de ingeniería de
software **sin conexión a internet**.

*(Figura 8: Aplicación móvil en funcionamiento y dictado por voz.)*

## 9. Guía Rápida de Solución de Problemas

- **No se visualiza el lienzo al entrar:** verificar que se haya iniciado sesión
  correctamente y que el backend esté en ejecución.
- **El móvil no conecta a la IP local:** comprobar que el teléfono y la
  computadora estén en la misma red Wi-Fi y que el firewall permita el tráfico
  en el puerto `8085`; alternativamente, usar la URL pública con HTTPS.
- **Ubicación de los archivos XMI exportados:** al exportar, el navegador guarda
  el archivo `.xmi` en la carpeta de **Descargas** del equipo.
