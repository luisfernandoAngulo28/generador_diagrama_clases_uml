# 2. Terminología de la Ingeniería de Software según la IEEE

**Grupo 43 — Luis Fernando Angulo Heredia · Elizabeth Peña Rivero**

## 2.1 Fuente

- **IEEE Std 610.12-1990**, *IEEE Standard Glossary of Software Engineering
  Terminology*: el glosario clásico de la IEEE. Fue reemplazado por:
- **ISO/IEC/IEEE 24765** (2010, revisado en 2017), *Systems and software
  engineering — Vocabulary*. Se puede consultar en línea como **SEVOCAB**
  (pascal.computer.org).

Las definiciones de abajo están **parafraseadas** a partir de esos estándares;
no son citas textuales. La columna «En nuestro proyecto» muestra el término
aplicado, para que no quede solo como teoría.

## 2.2 La definición fundamental

> **Ingeniería de software (IEEE 610.12):** la aplicación de un enfoque
> **sistemático, disciplinado y cuantificable** al desarrollo, la operación y el
> mantenimiento del software; es decir, la aplicación de la ingeniería al
> software. También incluye el **estudio** de esos enfoques.

**Software (IEEE):** los programas de computadora, los procedimientos y, si
corresponde, la documentación y los datos asociados que tienen que ver con la
operación de un sistema. Por eso el software **no es solo el código**: la
documentación y los datos también lo son.

## 2.3 Glosario

### Proceso y ciclo de vida

| Término | Definición (IEEE, parafraseada) | En nuestro proyecto |
|---|---|---|
| **Ciclo de vida del software** | Período que empieza cuando se concibe un producto de software y termina cuando ya no está disponible para su uso. Suele incluir requisitos, diseño, implementación, prueba, instalación, operación, mantenimiento y retiro. | Dos ciclos del PUD (1er y 2do Parcial). |
| **Modelo de ciclo de vida** | Marco de procesos y actividades organizados en fases que describe cómo se desarrolla el software. | PUD: Inicio, Elaboración, Construcción, Transición. |
| **Proceso** | Secuencia de pasos realizados con un propósito determinado. | Los flujos de trabajo del PUD. |
| **Fase** | Período del ciclo de vida con objetivos e hitos propios. | Las 4 fases del PUD por ciclo. |
| **Iteración** | Repetición de un conjunto de actividades que produce una versión mejorada del producto. | Iteraciones de Construcción del ciclo 2. |
| **Hito (milestone)** | Evento programado que marca el fin de una fase o el logro de un resultado. | Arquitectura estable al fin de la Elaboración. |
| **Mantenimiento** | Modificar un sistema después de entregado para corregir fallas, mejorar el rendimiento u otros atributos, o adaptarlo a un entorno nuevo. | Migración de PostgreSQL a MongoDB sin perder datos. |

### Requisitos

| Término | Definición | En nuestro proyecto |
|---|---|---|
| **Requisito** | Condición o capacidad que el usuario necesita para resolver un problema o alcanzar un objetivo, o que el sistema debe tener para cumplir un contrato o un estándar. | RF-13…RF-20 del ciclo 2. |
| **Requisito funcional** | Requisito que especifica una función que el sistema o componente debe poder realizar. | «Restaurar una versión del diagrama». |
| **Requisito no funcional / de calidad** | Requisito sobre *cómo* se realiza una función: rendimiento, seguridad, usabilidad, etc. | Sincronización en tiempo real; HTTPS. |
| **Especificación** | Documento que describe de forma completa, precisa y verificable los requisitos, el diseño o el comportamiento de un sistema. | Documento del examen (SDD como fuente de verdad). |
| **Caso de uso** | Secuencia de interacciones entre un actor y el sistema que produce un resultado de valor para el actor. | CU13–CU20. |

### Diseño y arquitectura

| Término | Definición | En nuestro proyecto |
|---|---|---|
| **Diseño** | Proceso de definir la arquitectura, los componentes, las interfaces y otras características de un sistema; también, el resultado de ese proceso. | Diagramas de clases de diseño (09). |
| **Arquitectura** | Organización fundamental de un sistema: sus componentes, sus relaciones entre sí y con el entorno, y los principios que guían su diseño y evolución. | Cliente React / Flutter, API NestJS, MongoDB + PostgreSQL. |
| **Componente** | Una de las partes que forman un sistema; puede subdividirse en otros componentes. | Módulos `diagrams`, `ai`, `generator`. |
| **Módulo** | Unidad de programa discreta e identificable respecto de la compilación, la combinación con otras unidades y la carga. | Módulos NestJS. |
| **Interfaz** | Frontera compartida a través de la cual interactúan dos componentes. | API REST y eventos de Socket.io. |
| **Acoplamiento** | Grado de interdependencia entre módulos. | Bajo: el generador solo recibe el modelo. |
| **Cohesión** | Grado en que las tareas de un módulo están relacionadas entre sí. | `VersionsService` solo maneja versiones. |
| **Abstracción** | Visión de un objeto que se enfoca en la información relevante para un propósito e ignora el resto. | Modelo UML independiente del lenguaje. |

### Construcción y configuración

| Término | Definición | En nuestro proyecto |
|---|---|---|
| **Código fuente** | Instrucciones escritas en un lenguaje de programación, antes de traducirlas a forma ejecutable. | Repositorio en GitHub. |
| **Línea base (baseline)** | Especificación o producto revisado y aprobado formalmente, que sirve de base para el desarrollo siguiente y solo cambia mediante control de cambios. | El commit entregado en cada parcial. |
| **Gestión de configuración** | Disciplina que identifica y documenta las características de los elementos de configuración, controla sus cambios y registra su estado. | Git y ramas `feat/*`. |
| **Versión** | Instancia identificada de un elemento, que difiere de otras en algo. | Historial de versiones del diagrama (`diagram_versions`). |

### Calidad, verificación y validación

| Término | Definición | En nuestro proyecto |
|---|---|---|
| **Calidad** | Grado en que un sistema satisface los requisitos especificados y las necesidades o expectativas del cliente o usuario. | Factores: fiabilidad, usabilidad, seguridad. |
| **Verificación** | Evaluar si un producto de una fase cumple las condiciones impuestas al inicio de esa fase: *¿estamos construyendo bien el producto?* | Script que comprueba que cada mensaje de las secuencias es una operación de la clase receptora. |
| **Validación** | Evaluar, durante o al final del desarrollo, si el sistema cumple los requisitos especificados: *¿estamos construyendo el producto correcto?* | Demostración con los usuarios en la defensa. |
| **Prueba (testing)** | Ejecutar un sistema o componente bajo condiciones especificadas, observar o registrar los resultados y evaluar algún aspecto. | 152 pruebas unitarias (Jest). |
| **Prueba unitaria** | Prueba de unidades individuales de hardware o software, o de grupos de unidades relacionadas. | `versions.service.spec.ts`. |
| **Prueba de integración** | Prueba en la que se combinan componentes y se evalúa la interacción entre ellos. | `probar-versiones.py` contra la pila local. |
| **Prueba de aceptación** | Prueba formal para decidir si un sistema cumple sus criterios de aceptación y si el cliente lo acepta. | Paso 4 de la defensa. |
| **Prueba de regresión** | Volver a probar un sistema después de modificarlo para verificar que los cambios no causaron efectos no deseados. | Toda la suite después de cada cambio del generador. |
| **Error** | Diferencia entre un valor calculado u observado y el valor correcto; también, la acción humana que produce un resultado incorrecto. | — |
| **Defecto (fault)** | Paso, proceso o definición de datos incorrecta en un programa. | Defectos 1–16 del registro. |
| **Falla (failure)** | Incapacidad de un sistema o componente para realizar la función requerida dentro de los requisitos. | Borrar un cliente borraba también sus pedidos (defecto 15). |
| **Fiabilidad** | Capacidad de un sistema de realizar su función bajo condiciones dadas durante un tiempo especificado. | Contenedores con `restart: unless-stopped`. |
| **Mantenibilidad** | Facilidad con que un sistema se modifica para corregir defectos, mejorar atributos o adaptarse a cambios. | Generador basado en plantillas. |
| **Portabilidad** | Facilidad con que un sistema se transfiere de un entorno de hardware o software a otro. | Docker Compose; Flutter (Android/iOS). |
| **Trazabilidad** | Grado en que se puede establecer una relación entre dos o más productos del proceso de desarrollo. | Caso de uso → secuencia → clase → código. |

**Cadena error → defecto → falla:** una persona comete un **error**, que deja un
**defecto** en el código. Cuando ese código se ejecuta, el defecto puede
producir una **falla** visible.

## 2.4 Referencias

- IEEE. *IEEE Std 610.12-1990 — Standard Glossary of Software Engineering
  Terminology*. IEEE, 1990.
- ISO/IEC/IEEE. *24765:2017 — Systems and software engineering — Vocabulary*.
  SEVOCAB: https://pascal.computer.org/
- IEEE Computer Society. *SWEBOK Guide v4.0*, 2024.
