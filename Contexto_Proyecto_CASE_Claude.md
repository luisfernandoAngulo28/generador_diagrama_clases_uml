# 🧠 Contexto Maestro del Proyecto para Claude AI

**Instrucción para Claude:** Eres un Tech Lead Senior, Arquitecto de Software y Experto en Desarrollo Móvil (Flutter/React Native) y Backend (Spring Boot). Tu objetivo es asistir paso a paso en el desarrollo de este proyecto universitario de alta complejidad con una fecha de entrega inamovible de 4 semanas (23 de Septiembre de 2026). Debes proporcionar código limpio, estrategias ágiles y soluciones precisas.

---

## 🏢 PARTE 1: Caso de Gestión (Examen Teórico)
**El Dilema:** La empresa de desarrollo (100+ ingenieros, certificaciones, productos ERP/MRP) ganó una licitación del Ministerio de Salud. El cliente exige entrega en **6 meses**, pero la estimación real interna es de **12 meses**.
**Requerimientos del Cliente:**
* Digitalizar historiales clínicos físicos y electrónicos.
* App móvil para reserva de fichas (evitar filas).
* Telemedicina (consultas remotas para recetas de tratamientos crónicos).
* Reportes estadísticos para gerencia.
**Tu tarea como IA en esta parte:** Ayudar a redactar la estrategia de gestión: qué hacer con el personal (contratar, horas extras, reasignar), cómo justificar los costos y proponer la arquitectura tecnológica.

---

## 📱 PARTE 2: Proyecto Práctico (Herramienta CASE Móvil)
**El Desarrollo Principal:** Construir una aplicación **exclusivamente móvil** que actúe como una herramienta CASE colaborativa.

### 🛠️ Funcionalidades Core
1. **Lienzo de Modelado:** Diseño visual de bases de datos y Diagramas de Clases UML.
2. **Validación Lógica:** Conversión del modelo conceptual al relacional, aplicando reglas de normalización y evitando redundancia.
3. **Exportación:** Los diagramas deben exportarse en formato estándar (ej. XMI) para ser leídos por herramientas como *Enterprise Architect*.
4. **Generador de Código (El Motor):** A partir del diagrama UML, la app móvil debe generar el código fuente completo de un backend funcional en **Spring Boot**.
5. **Estructura Estricta (4 Capas):** El código generado debe tener `Controllers`, `Models/Entities`, `Services` y `Repositories`.
6. **Base de Datos:** El backend generado debe estar configurado para conectarse a **PostgreSQL**.
7. **Pruebas:** El código generado debe poder compilarse (idealmente desplegado en un servidor Ubuntu con Nginx) y probarse inmediatamente usando **Postman**.

### 🤖 Requisitos de Inteligencia Artificial
1. **Multimodal:** Interacción mediante Chat (texto) y Comandos de Voz (ej: *"Crea dos clases con estos atributos y relaciónalas"*).
2. **Restricción de Prompt:** La IA debe estar "enjaulada" para responder ÚNICAMENTE sobre ingeniería de software.
3. **Arquitectura de IA Híbrida:**
   * La herramienta CASE móvil puede consumir una API externa.
   * La aplicación final generada (el producto cliente) DEBE tener una IA **100% Offline y local**. Se planea usar modelos ligeros GGUF (como `Gemma-2-2b-it-GGUF`) compilados para ejecutarse en el hardware del dispositivo.

---

## ⏱️ PARTE 3: El Día de la Defensa (23 de Septiembre)
**El Reto en Vivo:**
1. El profesor propondrá un modelo de sistema sorpresa (ej. Barbería, Restaurante).
2. Se debe diagramar en la app móvil.
3. Se debe generar el backend Spring Boot.
4. **El desafío final:** En 3 a 5 minutos, programar un frontend móvil básico (sugerido: Flutter o React Native) que consuma esa API recién generada.

---

## 🗺️ Roadmap Sugerido (Sprint de 4 Semanas)
* **Semana 1:** UI/UX interactiva (prototipado en Figma) y desarrollo del Lienzo de dibujo (Canvas) en Flutter/React Native.
* **Semana 2:** Desarrollo del Motor Generador de Código Spring Boot (plantillas para las 4 capas).
* **Semana 3:** Integración de la IA (API para chat/voz) y compilación del modelo GGUF local para funcionamiento offline.
* **Semana 4:** Simulacros de examen, conexión PostgreSQL, testeo masivo con Postman y práctica de código rápido (frontend en 5 minutos).

---

## 💬 Prompts Listos para Empezar a Trabajar
*(Copia y pega estos comandos en el chat para avanzar rápido)*

**Prompt 1 - Para el lienzo de dibujo:**
> "Claude, vamos a empezar por el lienzo interactivo de la herramienta CASE en [Flutter/React Native]. Necesito crear un canvas donde el usuario pueda arrastrar un rectángulo que represente una 'Clase UML', agregarle atributos y dibujar una línea (relación) hacia otra clase. Dame la estructura base y los paquetes recomendados para manejar gestos y pintura en pantalla."

**Prompt 2 - Para el generador Spring Boot:**
> "Claude, necesito construir el motor de generación de código. Dado un JSON que representa una Clase UML (con nombre, atributos y una relación OneToMany), escríbeme el script en Dart/JS que genere los 4 archivos en texto plano (`Controller.java`, `Entity.java`, `Service.java` y `Repository.java`) listos para Spring Boot y PostgreSQL."

**Prompt 3 - Para la integración de IA Local:**
> "Claude, el proyecto exige que el asistente de voz funcione de forma 100% offline en el dispositivo móvil usando un modelo como Gemma-2-2b-it-GGUF. ¿Cuál es la mejor librería actual en [Flutter/React Native] para cargar y ejecutar inferencias LLM locales en el hardware del móvil? Hazme un paso a paso de la implementación."

**Prompt 4 - Para el examen teórico (Gestión):**
> "Claude, ayúdame a resolver el caso de gestión. Tenemos 6 meses por licitación pero la estimación es de 12 meses. Redacta una justificación gerencial sólida: ¿Qué hacemos con los 100 ingenieros actuales? ¿Cómo manejamos horas extras o subcontratación? y ¿Cómo mitigamos el riesgo técnico de fallar la entrega?"
