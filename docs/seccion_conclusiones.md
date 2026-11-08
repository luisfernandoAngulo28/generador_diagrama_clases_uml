# Conclusiones y Recomendaciones

## Conclusiones

**Se cumplió el objetivo general.** La herramienta permite a un equipo modelar
diagramas de clases UML en tiempo real, con un Moderador IA que responde a cada
integrante por su nombre, y genera a partir del modelo un backend Spring Boot
que compila, arranca y responde a sus 30 peticiones de Postman. Está desplegada
en AWS con HTTPS y se puede usar desde el navegador y desde el celular.

| Objetivo | Resultado | Evidencia |
|---|---|---|
| Modelado colaborativo en tiempo real | Varios usuarios editan el mismo diagrama, con presencia y bloqueo por clase | CP-04, CP-09; Anexo C.3 |
| Generar el backend Spring Boot | Proyecto compilable con las cuatro capas, la base creada por el ORM y las reglas de mapeo de OMT | CP-01, CP-11, CP-14 |
| Moderador IA grupal | Chat público; responde por nombre con contexto grupal e individual; solo modifica el lienzo ante un pedido explícito | CP-07, CP-09 |
| Autoría y trazabilidad | Autoría por clase, atributo y relación calculada en el servidor; bitácora e historial de versiones con restaurar | CP-05, CP-12 |
| IA que funciona sin internet | Motor híbrido Gemini ⇄ Ollama con respaldo automático; asistente sin conexión en el celular | CP-08; Anexo C.6 |
| Visor móvil en tiempo real | El celular sigue el diagrama, el chat y la autoría sin recargar | CP-10 |
| Producto en la nube | Desplegado en AWS (EC2 y S3) con dominio y certificado; redesplegado en una cuenta nueva sin perder datos | SYS-05, SYS-08 |

**Lo que aprendimos:**

- **El modelo es la especificación.** Con el enfoque SDD, un error en el
  diagrama se convierte en un error en el código generado. Por eso la
  validación del modelo (clave primaria, nombres, relaciones) es tan importante
  como el generador.
- **Las pruebas unitarias no alcanzan.** El generador pasaba todas sus pruebas
  y aun así creaba tablas duplicadas; los defectos más importantes aparecieron
  al **levantar** el proyecto generado y al usar el sistema con varios usuarios
  (sección 5.5 de la Parte II).
- **La IA necesita reglas fuera del prompt.** Que la IA "solo cambie el
  diagrama si se lo piden" no se puede confiar al modelo: se verifica en el
  servidor (`applyCanvasPolicy`), igual que la autoría, que nunca la decide el
  cliente.
- **El proceso unificado ordena el trabajo.** Recorrer los flujos de trabajo
  en dos ciclos, con los modelos en Enterprise Architect, permitió verificar
  que cada mensaje de las secuencias del segundo ciclo existe en el código.

## Recomendaciones

- **Edición concurrente fina:** hoy un guardado reemplaza el modelo completo
  (*last-write-wins*), mitigado con bloqueos por clase y con el historial de
  versiones. El paso siguiente es sincronizar operaciones en lugar del modelo
  entero (por ejemplo, con CRDT).
- **Búsqueda semántica:** una base de datos vectorial permitiría que la IA
  encuentre conversaciones y diagramas anteriores por su significado y no por
  palabras exactas.
- **Separar el motor de IA:** si la carga crece, el motor de IA es el primer
  candidato para salir del monolito modular y escalar por separado, porque es
  el que más recursos consume.
- **Integración continua:** correr las 152 pruebas y `flutter analyze` en cada
  cambio con un *pipeline* (por ejemplo, GitHub Actions), y desplegar
  automáticamente al servidor.
- **Generar también el frontend:** extender el generador para producir las
  pantallas CRUD en Flutter a partir del mismo diagrama.
