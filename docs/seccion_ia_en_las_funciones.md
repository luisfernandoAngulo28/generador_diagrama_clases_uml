# Inteligencia Artificial en las Funciones del Software

> Sección para la Fundamentación Teórica (cumple el punto obligatorio "IA en las
> funciones del software", distinto de "IA en el desarrollo del software").
> Describe la IA como una funcionalidad incorporada dentro del producto.
> Anclada a la implementación real del proyecto.

## 1. Distinción conceptual

Es necesario distinguir dos usos de la inteligencia artificial en un proyecto de
software:

- **IA en el desarrollo del software:** el uso de herramientas de IA para
  *construir* el sistema (asistentes de programación, generación de código,
  etc.). Este aspecto se aborda en la sección correspondiente.
- **IA en las funciones del software:** la IA incorporada como **una
  característica del propio producto**, que el usuario final utiliza como parte
  del sistema. Es este segundo enfoque el que se describe aquí.

En este proyecto, la inteligencia artificial no es un accesorio, sino una
funcionalidad central de la herramienta: asiste al usuario a construir y
manipular los diagramas de clases mediante lenguaje natural, voz e imágenes.

## 2. Naturaleza de la asistencia: operaciones atómicas, no generación total

Una decisión de diseño clave es que la IA **no regenera el diagrama completo**
desde cero, sino que **asiste con operaciones concretas e incrementales** sobre
el modelo que el usuario ya está construyendo. El asistente devuelve un conjunto
de **operaciones atómicas** —por ejemplo, crear una clase, agregar un atributo o
establecer una relación— que se aplican y se validan sobre el estado actual del
lienzo, preservando el trabajo previo del usuario. Este enfoque respeta el
principio de que la IA **aumenta la productividad del diseñador sin reemplazar su
criterio**.

## 3. Funciones de IA implementadas en el producto

### 3.1 Asistente conversacional restringido al dominio
El usuario interactúa con un asistente por chat que responde exclusivamente
sobre ingeniería de software y sobre el proyecto en curso, rechazando temas
ajenos al dominio (asistente "enjaulado"). A partir de instrucciones en lenguaje
natural (por ejemplo, "agrega el módulo de pagos a los pedidos"), el asistente
propone las operaciones atómicas necesarias sobre el diagrama.

### 3.2 Interacción por voz
Los comandos pueden dictarse por voz en lugar de escribirse: en la herramienta
web mediante la Web Speech API del navegador, y en el cliente móvil mediante el
reconocimiento de voz nativo del dispositivo. La instrucción transcrita se envía
al mismo canal del asistente, habilitando un flujo de trabajo manos libres.

### 3.3 Interpretación de fotografías y bocetos (visión artificial)
La herramienta permite subir una **fotografía de un diagrama de clases dibujado
a mano** (en una pizarra, un cuaderno o un boceto). Un servicio dedicado envía la
imagen a un modelo de visión, que detecta las clases, atributos y relaciones y
las transcribe automáticamente como elementos interactivos en el lienzo. Así, un
diseño informal en papel se convierte en un modelo formal editable.

### 3.4 Sugerencia inteligente de relaciones
A partir de las clases existentes en el diagrama, la IA puede **sugerir
relaciones** coherentes entre ellas (asociaciones, agregaciones, composiciones o
herencias), ayudando al usuario a completar el modelo con criterios de diseño
orientado a objetos.

## 4. Arquitectura de la capa de IA: proveedores intercambiables

La funcionalidad de IA se diseñó bajo el patrón **fachada** con **proveedores
intercambiables**, de modo que el motor de inteligencia artificial puede
sustituirse sin alterar el resto del sistema. Mediante configuración es posible
seleccionar:

- Un proveedor **en la nube** (Google Gemini), utilizado por defecto, que
  aporta capacidades multimodales (texto e imagen).
- Un proveedor **local** (basado en Ollama en el escritorio y en un modelo
  *on-device* en el cliente móvil), que permite ejecutar la asistencia de IA
  **sin conexión a internet**.

Cada función (conversación, visión, sugerencia) invoca al proveedor con su propio
conjunto de instrucciones especializadas —una forma ligera de especialización por
tarea—, lo que sienta las bases para una futura evolución hacia una arquitectura
de agentes más explícitamente separados (uno de conversación, uno de visión y uno
de manipulación directa del modelo).

## 5. Síntesis

La incorporación de la inteligencia artificial como función del software
—asistente conversacional por texto y voz, interpretación de imágenes, sugerencia
de relaciones y ejecución local sin conexión— convierte a la herramienta en un
entorno de modelado **asistido e intuitivo**, en el que la IA acelera y facilita
el diseño sin sustituir la labor de ingeniería del usuario.
