# 4. Comparación de ciclos de vida / estrategias de desarrollo de software

**Grupo 43 — Luis Fernando Angulo Heredia · Elizabeth Peña Rivero**

Se comparan **8 estrategias**. Para cada una: su enfoque, sus ventajas, sus
desventajas y **cuándo conviene usarla**, que es lo más importante. Al final hay
un cuadro resumen y la justificación de la estrategia que usamos en el proyecto.

---

## 4.1 Cascada (Royce, 1970)

**Enfoque:** lineal y secuencial. Requisitos → Análisis → Diseño →
Implementación → Pruebas → Mantenimiento. Una fase empieza cuando termina la
anterior, y cada una termina con documentación aprobada.

| Ventajas | Desventajas |
|---|---|
| Simple de entender y de administrar. | No admite bien los cambios de requisitos. |
| Hitos y documentación claros en cada fase. | El cliente ve el producto recién al final. |
| Fácil de estimar y de controlar por contrato. | Los errores de requisitos se descubren tarde, cuando corregirlos cuesta más. |

**Cuándo usarla:** requisitos **estables, completos y bien entendidos** desde el
inicio; tecnología conocida; contratos de alcance cerrado, regulación que exige
documentación por fase, o migraciones y sistemas pequeños ya conocidos.

## 4.2 Modelo en V

**Enfoque:** variante de la cascada en la que cada fase de desarrollo tiene una
fase de **prueba asociada**: requisitos ↔ aceptación, diseño de sistema ↔
prueba de sistema, diseño de arquitectura ↔ integración, diseño detallado ↔
prueba unitaria. Las pruebas se **planifican** al mismo tiempo que se diseña.

| Ventajas | Desventajas |
|---|---|
| La verificación y validación se planifican desde el principio. | Igual de rígido que la cascada ante cambios. |
| Trazabilidad clara entre requisitos y pruebas. | Sin prototipos ni entregas tempranas. |
| Detecta defectos de diseño antes de codificar. | Mucha documentación. |

**Cuándo usarlo:** sistemas **críticos** donde una falla es inaceptable y la
certificación lo exige: médicos, automotrices, aeronáuticos, ferroviarios, con
requisitos estables.

## 4.3 Prototipos (evolutivo o desechable)

**Enfoque:** construir rápido una versión parcial (sobre todo de la interfaz)
para que el cliente la **vea y opine**. El prototipo se descarta y se construye
el sistema real (desechable), o se refina hasta convertirse en el sistema
(evolutivo).

| Ventajas | Desventajas |
|---|---|
| Aclara requisitos difusos con el usuario. | El cliente puede creer que el prototipo ya es el producto. |
| Retroalimentación temprana; reduce el riesgo de construir lo que no se quería. | Tentación de dejar en producción código hecho «a la rápida». |
| Mejora la usabilidad. | Difícil de planificar y de presupuestar. |

**Cuándo usarlo:** el cliente **no sabe bien lo que quiere** o la interfaz es
lo más importante; como técnica **dentro** de otro modelo (en la Elaboración del
PUD, o en la espiral) para reducir el riesgo de requisitos.

## 4.4 Incremental

**Enfoque:** el sistema se divide en **incrementos**; cada uno pasa por un mini
ciclo (análisis, diseño, código, prueba) y se entrega funcionando. El primer
incremento es el núcleo, y los siguientes agregan funciones.

| Ventajas | Desventajas |
|---|---|
| Entregas tempranas de valor real. | Requiere una arquitectura bien definida desde el principio. |
| Menor riesgo: si algo falla, falla un incremento. | La integración de incrementos puede complicarse. |
| Absorbe cambios en los incrementos siguientes. | Cuesta definir el sistema completo de entrada. |

**Cuándo usarlo:** el producto se puede **dividir en partes útiles por sí
solas**; hay presión por salir pronto con un núcleo; los recursos llegan de a
poco. Nuestro 1er y 2do Parcial son, en la práctica, dos incrementos.

## 4.5 Espiral (Boehm, 1986)

**Enfoque:** iterativo y **orientado al riesgo**. Cada vuelta de la espiral
tiene 4 cuadrantes: determinar objetivos → **analizar y reducir riesgos**
(prototipos, simulaciones) → desarrollar y verificar → planificar la siguiente
vuelta. El proyecto puede cancelarse si el riesgo es demasiado alto.

| Ventajas | Desventajas |
|---|---|
| Gestión explícita del riesgo en cada vuelta. | Complejo de administrar; requiere expertos en análisis de riesgo. |
| Combina lo mejor de cascada y prototipos. | Caro para proyectos pequeños. |
| Adecuado para sistemas grandes y novedosos. | Difícil de explicar al cliente y de fijar por contrato. |

**Cuándo usarlo:** proyectos **grandes, costosos y de alto riesgo**, con
tecnología nueva o requisitos inciertos: defensa, investigación, sistemas que
no se hicieron antes.

## 4.6 Proceso Unificado (PUD / RUP)

**Enfoque:** **dirigido por casos de uso, centrado en la arquitectura, iterativo
e incremental**. Cada ciclo tiene 4 fases (Inicio, Elaboración, Construcción,
Transición) y cada fase tiene iteraciones en las que se recorren los flujos de
trabajo (requisitos, análisis, diseño, implementación, pruebas) con distinta
intensidad. Usa **UML** como lenguaje.

| Ventajas | Desventajas |
|---|---|
| Arquitectura estable temprano (al fin de la Elaboración), lo que reduce riesgos. | Pesado para equipos y proyectos pequeños si se aplica completo. |
| Trazabilidad: caso de uso → análisis → diseño → código → prueba. | Mucha documentación y muchos modelos. |
| Iterativo: absorbe cambios y entrega versiones ejecutables. | Requiere experiencia en modelado y en el proceso. |

**Cuándo usarlo:** sistemas **medianos a grandes**, con muchos casos de uso,
donde la **arquitectura** y el **modelado** son importantes y se exige
documentación formal (UML), como en entornos académicos o corporativos.

## 4.7 Ágil: Scrum y XP (Manifiesto Ágil, 2001)

**Enfoque:** iteraciones cortas (**sprints** de 1 a 4 semanas) que entregan
software funcionando. Prioriza a las personas, el software que funciona, la
colaboración con el cliente y la respuesta al cambio por sobre los procesos, la
documentación exhaustiva, los contratos y el plan. **Scrum** organiza el trabajo
(Product Owner, Scrum Master, equipo; backlog, sprint, daily, review,
retrospectiva). **XP** aporta prácticas técnicas: TDD, programación en pares,
integración continua y refactorización.

| Ventajas | Desventajas |
|---|---|
| Se adapta muy bien a los cambios de requisitos. | Requiere al cliente involucrado todo el tiempo. |
| Entregas frecuentes y retroalimentación continua. | Poca documentación: el conocimiento puede perderse. |
| Equipos autoorganizados y motivados. | Difícil de escalar a equipos grandes o distribuidos sin marcos extra (SAFe, LeSS). |
| Visibilidad del avance (burndown, tablero). | Estimar costo y plazo total por contrato es difícil. |

**Cuándo usarlo:** requisitos **cambiantes**, mercado rápido (startups,
productos web y móviles), equipos pequeños (3 a 9 personas) y un cliente
disponible para dar retroalimentación.

## 4.8 DevOps / Entrega continua

**Enfoque:** más que un ciclo de vida, una **cultura y un conjunto de prácticas**
que unen desarrollo (Dev) y operación (Ops). El ciclo es un bucle continuo:
planificar → codificar → construir → probar → liberar → desplegar → operar →
monitorear, automatizado con pipelines CI/CD, infraestructura como código y
contenedores.

| Ventajas | Desventajas |
|---|---|
| Despliegues frecuentes, rápidos y con poco riesgo. | Requiere mucha automatización e inversión en herramientas. |
| Retroalimentación real desde producción (monitoreo). | Cambio cultural difícil en organizaciones tradicionales. |
| Menor tiempo para recuperarse de una falla. | No reemplaza al análisis y diseño: se combina con ágil u otro modelo. |

**Cuándo usarlo:** servicios en la **nube** que cambian a menudo (SaaS,
aplicaciones web), donde importa la disponibilidad y la velocidad de entrega.
Suele combinarse con Scrum.

---

## 4.9 Cuadro comparativo

| Criterio | Cascada | V | Prototipos | Incremental | Espiral | PUD | Ágil | DevOps |
|---|---|---|---|---|---|---|---|---|
| **Tipo** | Lineal | Lineal | Evolutivo | Iterativo-incremental | Iterativo, por riesgo | Iterativo-incremental | Iterativo, adaptativo | Continuo |
| **Requisitos** | Fijos | Fijos | Difusos | Núcleo claro | Inciertos | Por casos de uso | Cambiantes | Cambiantes |
| **Tolerancia al cambio** | Baja | Baja | Alta | Media | Alta | Media-alta | Muy alta | Muy alta |
| **Gestión del riesgo** | Baja | Media | Media | Media | **Muy alta** | Alta | Alta | Alta |
| **Documentación** | Mucha | Mucha | Poca | Media | Media-alta | Mucha (UML) | Poca | Media (automatizada) |
| **Primera entrega útil** | Al final | Al final | Prototipo temprano | Temprana | Por vueltas | Por iteración | Cada sprint | Continua |
| **Participación del cliente** | Inicio y fin | Inicio y fin | Alta | Media | Media | Media | Muy alta | Media |
| **Tamaño de proyecto** | Pequeño-mediano | Mediano-grande | Pequeño-mediano | Mediano | Grande | Mediano-grande | Pequeño-mediano | Cualquiera |
| **Ejemplo típico** | Sistema contable de alcance cerrado | Software de un dispositivo médico | Interfaz de un sistema nuevo | ERP por módulos | Sistema de defensa | Sistema corporativo modelado en UML | App de una startup | Plataforma SaaS |

### Guía rápida de elección

| Si el proyecto tiene… | Conviene |
|---|---|
| Requisitos estables y contrato cerrado | Cascada |
| Seguridad crítica y certificación | Modelo en V |
| Usuario que no sabe lo que quiere | Prototipos (dentro de otro modelo) |
| Necesidad de salir pronto con un núcleo | Incremental |
| Alto riesgo técnico, tecnología nueva | Espiral |
| Muchos casos de uso, arquitectura importante, UML exigido | PUD |
| Requisitos que cambian todo el tiempo, equipo pequeño | Ágil (Scrum + XP) |
| Servicio en la nube con despliegues frecuentes | DevOps (con ágil) |

## 4.10 La estrategia de nuestro proyecto

Usamos el **Proceso Unificado de Desarrollo**, con **2 ciclos** (1er y 2do
Parcial) de 4 fases cada uno. Las razones:
- **Dirigido por casos de uso:** CU1–CU12 en el ciclo 1 y CU13–CU20 en el ciclo
  2, que se trazan hasta las secuencias, las clases y el código.
- **Centrado en la arquitectura:** el riesgo mayor era técnico (colaboración en
  tiempo real, IA, generación de código). Por eso fijamos la arquitectura
  (React/Flutter + NestJS + MongoDB/PostgreSQL + Socket.io) en la Elaboración.
- **Iterativo e incremental:** cada ciclo es un incremento que se entrega
  funcionando y desplegado en AWS.
- La asignatura exige **UML 2.5** y una herramienta CASE (Enterprise Architect),
  que es el lenguaje natural del PUD.

Tomamos también prácticas de otras estrategias: atacar primero lo más
**riesgoso** como en la espiral (la sincronización en tiempo real y la IA se
resolvieron antes que el resto) y prácticas **DevOps** (Docker Compose,
despliegue en la nube, pruebas automáticas antes de cada cambio).

## 4.11 Referencias

- Royce, W. W. "Managing the Development of Large Software Systems". *Proc.
  IEEE WESCON*, 1970.
- Boehm, B. W. "A Spiral Model of Software Development and Enhancement". *ACM
  SIGSOFT Software Engineering Notes*, 11(4), 1986.
- Jacobson, I., Booch, G., Rumbaugh, J. *El Proceso Unificado de Desarrollo de
  Software*. Addison-Wesley, 2000.
- Beck, K. et al. *Manifiesto por el Desarrollo Ágil de Software*, 2001.
  https://agilemanifesto.org/iso/es/manifesto.html
- Schwaber, K., Sutherland, J. *La Guía de Scrum*, 2020.
- Kim, G., Humble, J., Debois, P., Willis, J. *The DevOps Handbook*. IT
  Revolution, 2016.
- Pressman, R. S., Maxim, B. *Ingeniería del software: un enfoque práctico*,
  9.ª ed. McGraw-Hill, 2021.
- Sommerville, I. *Ingeniería de software*, 10.ª ed. Pearson, 2016.
