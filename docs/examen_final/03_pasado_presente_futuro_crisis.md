# 3. El software: pasado, presente y futuro — y la Crisis del Software

**Grupo 43 — Luis Fernando Angulo Heredia · Elizabeth Peña Rivero**

## 3.1 Pasado: orígenes y evolución

| Época | Qué pasaba con el software |
|---|---|
| **1843** | Ada Lovelace escribe un algoritmo para la Máquina Analítica de Babbage: se la considera la primera programadora. |
| **1936–1945** | Turing define la máquina universal (1936). Von Neumann describe la arquitectura de **programa almacenado** (1945): el programa se guarda en memoria igual que los datos. Así nace el software como algo separado del hardware. |
| **1950s** | Lenguaje de máquina y ensamblador. Aparecen los primeros lenguajes de alto nivel: **FORTRAN** (1957), **LISP** (1958), **COBOL** (1959). Grace Hopper y los primeros compiladores. El software venía «de regalo» con el hardware y se hacía a medida. |
| **1960s** | El hardware se vuelve más potente (IBM System/360, 1964) y los programas crecen mucho: el sistema operativo **OS/360** tuvo miles de años-persona de esfuerzo, retrasos y errores. Aparece la **Crisis del Software** (ver 3.4). **1968: Conferencia OTAN de Garmisch**, donde se acuña el término **«ingeniería de software»**. |
| **1970s** | **Programación estructurada** (Dijkstra, *Go To Statement Considered Harmful*, 1968). **Modelo en cascada** (Royce, 1970). Lenguaje C y UNIX. Bases de datos relacionales (Codd, 1970). Brooks publica *The Mythical Man-Month* (1975). |
| **1980s** | La PC hace que el software sea un **producto** que se vende aparte. Modelo en **espiral** (Boehm, 1986). **Orientación a objetos** (Smalltalk, C++). Brooks: *No Silver Bullet* (1986). CMM para medir la madurez de los procesos. |
| **1990s** | **UML** (1997, Booch, Rumbaugh y Jacobson) y el **Proceso Unificado** (1999). Internet y la Web. Java (1995). El código abierto: Linux, Apache. |
| **2000s** | **Manifiesto Ágil** (2001), Scrum y XP. Servicios web, SOA. Smartphones (2007) y tiendas de aplicaciones. Control de versiones distribuido (Git, 2005). |
| **2010s** | **Nube** (AWS, Azure, GCP), **DevOps** y entrega continua, contenedores (**Docker** 2013, Kubernetes 2014), microservicios, NoSQL, aprendizaje profundo. |

## 3.2 Presente: la realidad actual (2020s)

- **El software está en todo:** bancos, salud, autos, energía, gobierno. Una
  falla ya no es solo un programa que se cierra: puede detener un país. Un
  ejemplo es la actualización defectuosa de **CrowdStrike** (julio de 2024),
  que dejó millones de equipos Windows sin arrancar y paralizó aeropuertos,
  hospitales y bancos.
- **Nube y DevOps:** se despliega varias veces al día, con infraestructura como
  código y monitoreo continuo. Nuestro proyecto: Docker Compose en una
  instancia EC2 de AWS, con S3 para los adjuntos.
- **IA en el desarrollo:** asistentes de código y agentes que generan, revisan y
  prueban software. Nuestro proyecto: un moderador IA que modifica el
  diagrama con operaciones atómicas, interpreta fotos de pizarra y genera el
  backend Spring Boot. También tiene un modelo **local** (Ollama) y uno
  **on-device** (Flutter).
- **Tiempo real y colaboración:** los usuarios esperan editar juntos, como en
  Google Docs o Figma. Nuestro proyecto: Socket.io, presencia, bloqueos,
  autoría, bitácora e historial de versiones.
- **Seguridad y cadena de suministro:** casi todo el software depende de
  librerías de terceros. **Log4Shell** (2021) mostró que una vulnerabilidad en
  una sola librería puede afectar a medio Internet.
- **Persisten los problemas de siempre:** proyectos que se pasan de plazo y de
  presupuesto, deuda técnica y sistemas antiguos (COBOL sigue corriendo en
  bancos y gobiernos).

## 3.3 Proyección

| Plazo | Proyección (solo software) |
|---|---|
| **Corto (1–3 años)** | La IA generativa se vuelve una herramienta normal en todo el ciclo: requisitos, diseño, código, pruebas y documentación. El rol del ingeniero se desplaza hacia **especificar, revisar y verificar** lo que genera la IA. Más regulación: la **Ley de IA de la Unión Europea** y las exigencias de ciberseguridad y de inventario de dependencias (SBOM). Más plataformas *low-code*. |
| **Mediano (3–7 años)** | **Agentes** de software que mantienen sistemas en forma semiautónoma: corrigen defectos, actualizan dependencias, migran código antiguo. Más **verificación formal** y pruebas automáticas, porque hay más código del que una persona puede revisar. El **modelo** (la especificación, por ejemplo UML) vuelve a ser central: se escribe el «qué» y la herramienta genera el «cómo», como el generador de nuestro proyecto. |
| **Largo (más de 10 años)** | Programación en lenguaje natural como interfaz habitual. Software que se adapta solo a su entorno. Lo que no se automatiza es lo que define a la ingeniería: **decidir qué construir**, la responsabilidad ética y legal, y la seguridad de sistemas críticos. Posible cambio de paradigma con la computación cuántica para problemas específicos. |

## 3.4 La Crisis del Software

### Qué fue

Así se llamó, a fines de los años 60, a la **incapacidad de producir software de
calidad a tiempo y dentro del presupuesto**, en un momento en que el hardware
mejoraba muy rápido y la demanda de software crecía más rápido todavía. El
término se popularizó en las **conferencias de la OTAN de 1968 (Garmisch) y
1969 (Roma)**, donde se propuso tratar el desarrollo de software como una
**ingeniería**. Esa es la razón por la que nace la ingeniería de software.

Dijkstra lo resumió así en *The Humble Programmer* (1972): cuando no había
máquinas, programar no era un problema; con computadoras débiles era un
problema leve, y con computadoras enormes se convirtió en un problema enorme.

### Síntomas

- Proyectos que superaban el **plazo** y el **presupuesto**.
- Software **ineficiente**, de **baja calidad** y que **no cumplía los
  requisitos**.
- Código **difícil de mantener** y proyectos que **nunca se entregaban**.
- Estimaciones poco fiables. Brooks lo explicó con su ley: *agregar gente a un
  proyecto atrasado lo atrasa más*.

### Causas

- **Complejidad** propia del software: Brooks distingue la complejidad
  **esencial** (la del problema, que no se puede eliminar) de la
  **accidental** (la de las herramientas, que sí se puede reducir).
- Ausencia de métodos, de especificación de requisitos y de pruebas
  sistemáticas: se programaba «a la medida» y de forma artesanal.
- Requisitos que cambian, y una comunicación deficiente con el cliente.
- El software es **invisible** y **no se desgasta**, pero se deteriora con los
  cambios.

### Casos que la ilustran

| Caso | Año | Qué falló |
|---|---|---|
| **OS/360** (IBM) | 1960s | Retrasos enormes y miles de errores. Origen de *The Mythical Man-Month*. |
| **Therac-25** | 1985–87 | Máquina de radioterapia: una condición de carrera en el software causó sobredosis de radiación mortales. |
| **Ariane 5, vuelo 501** | 1996 | El cohete explotó a los 37 s por un desbordamiento al convertir un número de 64 bits a 16 bits, en código reutilizado del Ariane 4. |
| **Mars Climate Orbiter** | 1999 | Un módulo usaba unidades inglesas y otro métricas: la sonda se perdió. |
| **Boeing 737 MAX (MCAS)** | 2018–19 | Software de control que dependía de un solo sensor; dos accidentes. |
| **CrowdStrike** | 2024 | Una actualización defectuosa dejó ~8,5 millones de equipos Windows sin arrancar. |

El **informe CHAOS** del Standish Group (1994) estimó que solo un **16%** de
los proyectos terminaba a tiempo, dentro del presupuesto y con todas sus
funciones; un 31% se cancelaba. En las ediciones recientes los proyectos
exitosos rondan el **30%**: mejoró, pero sigue siendo una minoría.

### ¿Hemos superado la crisis del software?

**Nuestra respuesta: no del todo. La crisis no se superó, se transformó en una
condición crónica.**

**Lo que sí mejoró:**
- Hay métodos (PUD, ágiles), estándares (IEEE, ISO), notaciones (UML) y
  herramientas (control de versiones, pruebas automáticas, integración
  continua, nube) que **no existían en 1968**.
- Hoy se construyen con éxito sistemas mucho más grandes que el OS/360, y el
  porcentaje de proyectos exitosos casi se duplicó desde 1994.

**Lo que sigue igual:**
- Los **mismos síntomas** siguen apareciendo: proyectos atrasados, cancelados o
  con fallas graves (CrowdStrike, 737 MAX).
- La demanda de software sigue creciendo más rápido que la capacidad de
  producirlo bien. Lo que se resolvió para los sistemas de 1968 vuelve a
  aparecer con los de hoy: distribuidos, en tiempo real, con IA.
- Brooks tenía razón: **no hay bala de plata**. Cada avance reduce la
  complejidad *accidental*, pero la *esencial* sigue ahí.
- La IA crea un riesgo nuevo: produce **más código, más rápido**, pero el
  cuello de botella pasa a ser **verificar** que ese código es correcto. Por
  eso Pressman habla de una **«aflicción crónica»** más que de una crisis: no
  es un episodio que terminó, es una condición que se administra con
  ingeniería.

**Lo que aprendimos en nuestro proyecto:** la crisis aparece a pequeña escala
cuando se omite la ingeniería. El generador de Spring Boot «funcionaba» y
pasaba sus pruebas unitarias, pero al **levantar de verdad** el proyecto
generado encontramos 4 defectos (tablas duplicadas, agregación invertida,
cascadas incorrectas, datos inválidos). Lo que lo evitó fue disciplina:
verificación, registro de defectos y pruebas de regresión. Ninguna herramienta
lo habría resuelto sola.

## 3.5 Referencias

- Naur, P., Randell, B. (eds.). *Software Engineering: Report of a Conference
  Sponsored by the NATO Science Committee*, Garmisch, 1968.
- Dijkstra, E. W. "The Humble Programmer". *Communications of the ACM*, 15(10), 1972.
- Brooks, F. P. *The Mythical Man-Month*. Addison-Wesley, 1975 (ed. 1995).
- Brooks, F. P. "No Silver Bullet — Essence and Accident in Software
  Engineering". *IEEE Computer*, 20(4), 1987.
- Pressman, R. S., Maxim, B. *Ingeniería del software: un enfoque práctico*,
  9.ª ed. McGraw-Hill, 2021.
- Sommerville, I. *Ingeniería de software*, 10.ª ed. Pearson, 2016.
- Standish Group. *CHAOS Report*, 1994 y ediciones posteriores.
- Leveson, N., Turner, C. "An Investigation of the Therac-25 Accidents". *IEEE
  Computer*, 26(7), 1993.
- Lions, J. L. et al. *Ariane 5 Flight 501 Failure — Report by the Inquiry
  Board*, 1996.
