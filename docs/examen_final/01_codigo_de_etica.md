# 1. Código de Ética del Ingeniero de Software (ACM/IEEE-CS)

**Grupo 43 — Luis Fernando Angulo Heredia · Elizabeth Peña Rivero**

## 1.1 Origen

El *Software Engineering Code of Ethics and Professional Practice* fue elaborado
por un grupo de trabajo conjunto de la **ACM** (Association for Computing
Machinery) y la **IEEE Computer Society**, y aprobado por ambas en **1999**
(versión 5.2). Busca que la ingeniería de software sea una profesión
**beneficiosa y respetada**. Tiene dos versiones: una corta (preámbulo y ocho
principios) y una completa (cada principio con sus cláusulas).

La idea central del preámbulo: como los ingenieros de software tienen la
oportunidad de **hacer el bien o causar daño**, o de que otros lo hagan a través
de su trabajo, deben comprometerse a que ese trabajo sea útil. El código no es
una lista mecánica: pide **juicio profesional** y, ante un conflicto, el
**interés público** va primero.

## 1.2 Los ocho principios

| # | Principio | Qué pide (resumen propio) |
|---|---|---|
| 1 | **Público** | Actuar de forma coherente con el interés público. Aprobar software solo si se cree que es seguro, cumple su especificación y no daña la calidad de vida, la privacidad ni el ambiente. Revelar peligros conocidos. |
| 2 | **Cliente y empleador** | Actuar en el mejor interés del cliente y del empleador, siempre que no contradiga el interés público. Ser honesto sobre las propias limitaciones, no usar software obtenido ilegalmente, respetar la confidencialidad. |
| 3 | **Producto** | Que los productos y sus modificaciones alcancen los **estándares profesionales más altos posibles**: metas de calidad, costo y plazo realistas, pruebas y revisión adecuadas, documentación correcta. |
| 4 | **Juicio** | Mantener la **integridad e independencia** del juicio profesional. No firmar documentos que no se han revisado; rechazar sobornos y conflictos de interés no declarados. |
| 5 | **Gestión** | Los líderes y gerentes deben promover un enfoque ético en el desarrollo y mantenimiento: estimaciones honestas, asignar trabajo según la capacidad, no castigar a quien expresa preocupaciones éticas. |
| 6 | **Profesión** | Promover la integridad y la reputación de la profesión, de manera coherente con el interés público. Difundir el conocimiento y no promover intereses propios a costa de la profesión. |
| 7 | **Colegas** | Ser justo y apoyar a los colegas: dar crédito por el trabajo ajeno, revisar el trabajo de otros con imparcialidad y ayudar a su desarrollo. |
| 8 | **Uno mismo** | **Aprendizaje continuo** durante toda la vida profesional y promover un enfoque ético en la práctica de la profesión. |

**Jerarquía:** el principio 1 (Público) es el criterio de desempate. Si lo que
pide el cliente o el empleador (principio 2) daña al público, prevalece el
público.

## 1.3 Cómo lo aplicamos en nuestro proyecto

| Principio | Decisión concreta en el Diagramador UML colaborativo |
|---|---|
| **Público** | Las contraseñas se guardan con hash (bcrypt) y nunca en texto plano. Los adjuntos en S3 se sirven con URL firmadas que caducan en 5 minutos, y hay una lista blanca de tipos de archivo (se rechaza un `.exe`). |
| **Cliente** | Los secretos (claves de AWS, token de DuckDNS, clave de Gemini) viven en `.env` fuera de git y no se comparten. Se declaran las limitaciones: la IA local es un modelo pequeño y lo decimos en el documento. |
| **Producto** | 152 pruebas unitarias del backend; el backend Spring Boot generado se **levantó de verdad** contra PostgreSQL. Así encontramos 4 defectos del generador (defectos 13–16) que no habríamos visto solo leyendo el código. |
| **Juicio** | El registro de defectos documenta también nuestros errores. Por ejemplo, la agregación estaba invertida en el generador, y lo dejamos escrito en vez de ocultarlo. |
| **Gestión** | Plan de iteraciones del PUD con estimaciones revisadas; los cambios de alcance se anotan en la bitácora del documento. |
| **Profesión** | Respetamos las licencias de las librerías usadas (MIT/Apache) y citamos la bibliografía. |
| **Colegas** | La **autoría** de cada clase y la **bitácora** del diagrama registran quién hizo cada cambio, y el historial de versiones permite volver atrás sin borrar el trabajo de otro. Los cambios de la IA quedan marcados como «vía IA». |
| **Uno mismo** | Aprendimos tecnologías nuevas para el proyecto: NestJS, MongoDB, Socket.io, Flutter y modelos locales con Ollama. |

## 1.4 Ética y la IA en el proyecto

El código no habla de IA (es de 1999), pero sus principios se aplican directamente:
- **Transparencia (Juicio, Colegas):** todo cambio de la IA queda registrado con
  la etiqueta «vía IA» en la bitácora y en las versiones. Nunca se atribuye a
  una persona.
- **Control humano (Público, Producto):** la IA propone operaciones atómicas
  sobre el modelo, y el usuario puede **restaurar** cualquier versión anterior.
- **Privacidad (Público):** existe la opción de un modelo **local** (Ollama,
  `moderador-uml`) para que el diagrama no tenga que salir a un servicio externo.

## 1.5 Referencias

- ACM/IEEE-CS Joint Task Force on Software Engineering Ethics and Professional
  Practices. *Software Engineering Code of Ethics and Professional Practice*,
  v5.2, 1999. https://ethics.acm.org/code-of-ethics/software-engineering-code/
- ACM. *ACM Code of Ethics and Professional Conduct*, 2018.
- Gotterbarn, D., Miller, K., Rogerson, S. "Software Engineering Code of Ethics
  is Approved". *Communications of the ACM*, 42(10), 1999.
