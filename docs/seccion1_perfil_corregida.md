# 1. Perfil (versión corregida — alineada al código real y al enunciado)

> Reemplaza tu sección 1 actual por esta. Cambios clave: se reorienta de
> "gestión de proyectos con integrantes y roles" (que no existe en el código) a
> una herramienta **CASE diagrama-céntrica**, y se incorporan las capacidades
> reales que el enunciado exige y que sí están implementadas: cliente móvil,
> IA local, foto-a-diagrama, interoperabilidad XMI con Enterprise Architect y
> operación offline.

## 1.1 Introducción

El presente proyecto propone el desarrollo de una **herramienta CASE**
(Ingeniería de Software Asistida por Computadora) orientada al diseño de datos
mediante **diagramas de clases UML 2.5**, con un enfoque que abarca desde el
modelado conceptual hasta la generación automática de la implementación. La
iniciativa surge de la necesidad de contar con herramientas que no solo
permitan modelar de manera visual y estructurada los elementos de un sistema,
sino que además integren generación automática de código, colaboración en
tiempo real y asistencia por inteligencia artificial.

El sistema permite crear diagramas de clases y transformarlos en un **backend
Spring Boot** completo, estructurado en cuatro capas (Controlador, Servicio,
Repositorio y Entidad), con operaciones CRUD y sus respectivos endpoints REST
documentados con Swagger, listos para ser probados. De esta forma se garantiza
la coherencia entre el diseño conceptual y la implementación técnica,
reduciendo tiempos de desarrollo y minimizando errores en el traspaso entre
fases.

Adicionalmente, el proyecto integra **colaboración en tiempo real** que permite
a múltiples usuarios trabajar sobre un mismo diagrama de forma simultánea, con
control de exclusión mediante bloqueo por clase para evitar conflictos de
edición. A ello se suma un **módulo de inteligencia artificial** que asiste al
diseñador mediante operaciones atómicas sobre el modelo, comandos de voz e
interpretación de fotografías de diagramas dibujados a mano, con la capacidad
de operar con **modelos de IA locales** tanto en escritorio como en el cliente
móvil, garantizando su funcionamiento incluso sin conexión a internet.

Finalmente, la herramienta contempla la **interoperabilidad con Enterprise
Architect** mediante el estándar XMI (importación y exportación de modelos) y un
**cliente móvil desarrollado en Flutter** que consume el backend generado,
opera por voz y funciona de manera offline, sincronizando los cambios al
recuperar la conexión.

En conjunto, este proyecto busca ofrecer una solución integral que combine el
diseño UML, la generación automática de software, la colaboración en línea y la
asistencia por IA, constituyéndose en una herramienta útil para estudiantes,
desarrolladores y profesionales del área de la ingeniería de software.

## 1.2 Objetivos

### 1.2.1 Objetivo General

Desarrollar una herramienta CASE web y su cliente móvil que integren el
modelado de diagramas de clases UML, la generación automática de un backend
Spring Boot y la colaboración en tiempo real, en un entorno interactivo
asistido por inteligencia artificial.

### 1.2.2 Objetivos Específicos

- Desarrollar un módulo de modelado de diagramas de clases UML 2.5 que
  posibilite la creación, edición y administración de clases, atributos,
  operaciones y relaciones de manera estructurada y visual, con validación de
  integridad lógica del modelo.
- Implementar un motor de generación automática de un backend Spring Boot en
  arquitectura de cuatro capas, con operaciones CRUD, endpoints REST,
  documentación Swagger y despliegue con Docker.
- Incorporar un módulo de asistencia por inteligencia artificial que opere
  mediante operaciones atómicas sobre el modelo, comandos de voz e
  interpretación de fotografías, con soporte de modelos de IA locales para su
  funcionamiento sin conexión.
- Implementar capacidades de trabajo colaborativo en línea que permitan la
  participación simultánea de múltiples usuarios sobre un mismo diagrama, con
  visualización de presencia y control de exclusión mediante bloqueo por clase.
- Habilitar la interoperabilidad con Enterprise Architect mediante la
  importación y exportación de modelos en formato estándar XMI.
- Desarrollar un cliente móvil en Flutter que consuma el backend generado,
  permita interacción por voz y opere de forma offline con sincronización al
  reconectar.
- Garantizar la coherencia entre el diseño de los diagramas UML y la generación
  automática del backend, asegurando la integridad y calidad del software
  producido.

## 1.3 Descripción del problema

En la actualidad, el proceso de diseño y desarrollo de software requiere
herramientas que faciliten tanto la representación conceptual de los sistemas
como la generación de código funcional que sirva de base para su
implementación. Sin embargo, la mayoría de las herramientas disponibles
presentan limitaciones al separar la fase de modelado de la fase de desarrollo,
lo que genera inconsistencias, retrabajo y pérdida de tiempo en la transición
entre diseño e implementación.

Por otra parte, la colaboración entre los integrantes de un equipo se ve
dificultada cuando no existen entornos que permitan trabajar de manera conjunta
y en tiempo real sobre un mismo modelo. Cuando varias personas editan
simultáneamente, además, surge la necesidad de controlar la exclusión y la
coordinación para evitar que los cambios de unos sobrescriban los de otros.
Esta situación impacta en la comunicación del equipo, reduce la productividad y
afecta la calidad del producto final.

Asimismo, el uso de diagramas UML, en particular los diagramas de clases, suele
restringirse a fines documentales, sin que exista una integración directa con
la generación de componentes de software listos para utilizar, ni con
herramientas de modelado consolidadas como Enterprise Architect. Esto genera
una brecha entre lo diseñado y lo implementado, que representa un obstáculo en
el desarrollo ágil y eficiente de aplicaciones.

Finalmente, aunque existen sistemas de diagramación en línea, pocos incorporan
mecanismos de interacción más accesibles e intuitivos —como los comandos de voz
o la interpretación de fotografías— ni contemplan escenarios de operación sin
conexión a internet, especialmente desde dispositivos móviles.

En este contexto, se identifica la necesidad de contar con una herramienta web,
acompañada de un cliente móvil, que integre el modelado de diagramas de clases
UML en un entorno colaborativo e interactivo, que permita generar de forma
automática un backend funcional, interopere con Enterprise Architect y ofrezca
mecanismos innovadores de interacción asistidos por inteligencia artificial,
incluso de manera local y sin conexión.

## 1.4 Alcance

### 1.4.1 Módulo de Gestión de Usuarios
- Autenticación de usuarios mediante registro, inicio de sesión y cierre de
  sesión, con tokens JWT.

### 1.4.2 Módulo de Modelado de Diagramas UML
- Lienzo de trabajo para la creación, edición y eliminación de diagramas de
  clases UML 2.5 (clases, atributos tipados, operaciones y relaciones:
  asociación, agregación, composición, herencia, dependencia y realización, con
  multiplicidades y roles).
- Validación de integridad lógica y normalización del modelo en tiempo real.
- Bitácora de cambios que registra qué usuario modificó qué y cuándo.
- Adjuntos por diagrama (documentos e imágenes) almacenados en Amazon S3.
- Exportación del diagrama como imagen PNG y generación de documentación del
  modelo en HTML.

### 1.4.3 Módulo de Asistencia por Inteligencia Artificial
- Asistente que aplica operaciones atómicas sobre el modelo (crear clase,
  agregar atributo, crear relación, etc.), sin regenerar el diagrama completo.
- Interacción por comandos de voz y por texto.
- Interpretación de fotografías de diagramas dibujados a mano (foto de pizarra),
  convertidas automáticamente en clases y relaciones.
- Soporte de modelos de IA locales (en escritorio y en el cliente móvil) para
  operar sin conexión a internet.

### 1.4.4 Módulo de Colaboración en Tiempo Real
- Edición simultánea de un mismo diagrama por múltiples usuarios.
- Visualización de la presencia de los usuarios conectados.
- Control de exclusión mediante bloqueo por clase: mientras un usuario edita una
  clase, esta queda bloqueada para los demás, sincronizándose al liberarla.

### 1.4.5 Módulo de Generación de Backend
- Generación automática de un backend Spring Boot en arquitectura de cuatro
  capas (Controlador, Servicio, Repositorio, Entidad) con PostgreSQL.
- Operaciones CRUD y endpoints REST por cada clase del diagrama.
- Documentación de la API con Swagger UI y empaquetado con Docker Compose.

### 1.4.6 Módulo de Interoperabilidad (Enterprise Architect)
- Importación y exportación de modelos en formato estándar XMI, permitiendo
  llevar un diagrama desde la herramienta hacia Enterprise Architect y viceversa.

### 1.4.7 Cliente Móvil (Flutter)
- Aplicación móvil que consume el backend generado para probar sus endpoints.
- Interacción por voz (reconocimiento de voz local).
- Operación offline: encola las operaciones realizadas sin conexión y las
  sincroniza al recuperar la conectividad.
- Asistente de IA local en el dispositivo, operativo sin internet.
