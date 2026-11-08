r"""Diagramas de secuencia del Ciclo 1 (CU1–CU12) con operaciones reales.

Igual que los del Ciclo 2, cada mensaje que llega a un objeto es una operación
de su clase en el código actual; verificar_secuencias.py lo comprueba. Escribe
docs/diagrams/1er_parcial/seq_cu*.plantuml (reemplaza a los convertidos desde
Mermaid, que describían acciones y no operaciones):

    python docs/diagrams/ea/secuencias_ciclo1.py
    $env:EA_CICLO = "1"; python docs/diagrams/ea/ea_builder.py seq_cu1 ... seq_cu12
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '1er_parcial'))
SUB = r'\n<size:11>Diagrama de Secuencia · UML 2.5.1 · Ciclo 1 · cada mensaje es una operación de la clase que lo recibe</size>'

D = {}

D[1] = ('Crear Clase UML', r'''
actor Usuario as U
boundary ":App" as A
U -> A : addClass() [botón "+ Clase"]
A -> A : pushHistory()
A -> A : createDefaultClass()
A --> U : clase "NuevaClase" en el lienzo
note over A : addClass() agrega el nodo a React Flow con un id crypto.randomUUID()
''')

D[2] = ('Editar Clase UML', r'''
actor Usuario as U
boundary ":App" as A
boundary ":ClassInspector" as I
U -> A : handleEditClass(classId) [doble clic en la clase]
A -> I : ClassInspector(props: clase, onChange, onDelete)
U -> I : onChange(evento) [escribe el nombre o un atributo]
I -> A : updateClass(updated)
A --> U : nodo actualizado en el lienzo
''')

D[3] = ('Eliminar Clase UML', r'''
actor Usuario as U
boundary ":ClassInspector" as I
boundary ":App" as A
U -> I : onDelete() [botón "Eliminar clase"]
I -> A : deleteClass(classId)
A -> A : pushHistory()
A -> A : releaseLock(classId)
A --> U : la clase y sus relaciones desaparecen del lienzo
''')

D[4] = ('Crear Relación', r'''
actor Usuario as U
boundary ":App" as A
participant ":Multiplicity" as M
participant ":ReactFlow" as RF
U -> A : onConnect(connection) [arrastra de una clase a otra]
A -> A : pushHistory()
A -> M : edgeAppearance(nextRelationType)
M --> A : marcadores y multiplicidades UML
A -> RF : addEdge(relación, aristas)
A --> U : relación dibujada con su notación
''')

D[5] = ('Guardar Diagrama', r'''
actor Usuario as U
boundary ":App" as A
participant ":ApiClient" as API
control ":DiagramsController" as C
control ":DiagramsService" as S
participant ":AuthorshipUtil" as AU
participant ":Model<DiagramDocument>" as DB
control ":VersionsService" as V
U -> A : saveDiagram() [botón "Guardar"]
A -> A : buildModel()
A -> API : updateDiagram(id, name, model, source)
API -> C : update(id, dto, user) [PATCH /diagrams/:id]
C -> S : update(id, dto, user, source)
S -> S : findOne(id)
S -> AU : applyAuthorship(previous, incoming, stamp)
S -> AU : diffModel(previous, incoming)
S -> DB : findByIdAndUpdate(id, {$set})
S -> V : record(versión)
S --> C : diagrama guardado
C --> API : 200
API --> A : diagrama
A --> U : "guardado correctamente"
note over A : la primera vez se usa createDiagram(name, model) [POST /diagrams]
''')

D[6] = ('Cargar Diagrama Compartido', r'''
actor Usuario as U
boundary ":App" as A
participant ":ApiClient" as API
control ":DiagramsController" as C
control ":DiagramsService" as S
participant ":Model<DiagramDocument>" as DB
participant ":UmlTypes" as T
U -> A : loadDiagram(id) [abre el enlace ?diagram=id]
A -> API : getDiagram(id)
API -> C : findOne(id) [GET /diagrams/:id]
C -> S : findOne(id)
S -> DB : findById(id)
DB --> S : documento
S --> C : diagrama
C --> API : 200 + modelo
API --> A : diagrama
A -> T : authorshipIndexOf(model)
T --> A : autoría por clase
A --> U : clases y relaciones en sus posiciones
''')

D[7] = ('Colaborar en Tiempo Real', r'''
actor Usuario as U
actor "Usuario Colaborador" as UC
boundary ":App" as A
boundary ":App (colaborador)" as AC
control ":DiagramsGateway" as G
participant ":Server (Socket.io)" as SV
U -> A : loadDiagram(id)
A -> G : handleJoin(client, payload) [join-diagram]
G -> G : broadcastPresence(diagramId)
G -> SV : emit('presence', {count})
UC -> AC : onConnect(connection) [edita el diagrama]
AC -> G : handleUpdate(client, payload) [diagram-update]
G -> SV : emit('diagram-update', cambios) [al resto de la sala]
SV -> A : handleRemoteUpdate(payload)
A --> U : lienzo actualizado sin recargar
''')

D[8] = ('Generar Backend Spring Boot', r'''
actor Usuario as U
boundary ":App" as A
participant ":ApiClient" as API
control ":GeneratorController" as GC
control ":DiagramsService" as S
control ":GeneratorService" as GS
participant ":ZipArchive" as Z
U -> A : generateBackend() [botón "Generar backend"]
A -> API : downloadGeneratedBackend(id)
API -> GC : generateZip(diagramId, res) [POST /generator/:id/zip]
GC -> S : findOne(diagramId)
S --> GC : diagrama
GC -> GS : generate(model, options)
GS -> GS : renderEntity(clase) [y Repository, Service, Controller por clase]
GS --> GC : archivos del proyecto
GC -> Z : append(contenido, ruta)
GC -> Z : finalize()
Z --> API : proyecto .zip
API --> U : descarga del proyecto
''')

D[9] = ('Exportar a XMI', r'''
actor Usuario as U
boundary ":App" as A
participant ":ApiClient" as API
control ":DiagramsController" as C
control ":DiagramsService" as S
participant ":XmiUtil" as X
U -> A : exportXmi() [Archivo → Exportar XMI]
A -> API : downloadXmi(id)
API -> C : exportXmi(id, res) [GET /diagrams/:id/xmi]
C -> S : findOne(id)
S --> C : diagrama
C -> X : renderXmi(name, model)
X --> C : documento XMI 2.1
C --> API : archivo .xmi
API --> U : descarga del archivo
''')

D[10] = ('Consultar Asistente de IA', r'''
actor Usuario as U
boundary ":ChatPanel" as CP
control ":ChatGateway" as G
control ":ModeratorService" as M
control ":AiService" as AI
control ":HybridAiProvider" as H
participant ":Server (Socket.io)" as SV
U -> CP : sendText(text) [Enviar]
CP -> G : handleSend(client, payload) [chat:send]
G -> M : answer(diagramId, user, question)
M -> AI : editDiagram(text, model, prompts)
AI -> H : editDiagram(message, model, prompts)
H --> AI : respuesta y operaciones
AI --> M : resultado
M --> G : respuesta dirigida a quien preguntó
G -> SV : emit('chat:new-message', respuesta)
SV --> CP : respuesta en el chat
note over G : desde el 2do Parcial la consulta pasa por el Moderador IA (detalle en CU15)
''')

D[11] = ('Dictar Comando por Voz', r'''
actor Usuario as U
boundary ":ChatPanel" as CP
control ":useSpeechRecognition" as SR
participant ":SpeechRecognition" as WS
U -> SR : start() [botón del micrófono]
SR -> WS : start()
WS -> WS : onresult(event) [el usuario dicta la frase]
WS --> SR : transcripción
SR -> CP : sendText(transcript) [onResult]
note over CP : el texto sigue el mismo camino que en CU10
''')

D[12] = ('Interpretar Foto de Pizarra', r'''
actor Usuario as U
boundary ":App" as A
participant ":ApiClient" as API
control ":AiController" as C
control ":AiService" as AI
control ":HybridAiProvider" as H
participant ":Multiplicity" as M
U -> A : handlePhotoSelected(e) [Archivo → Foto de pizarra]
A -> A : readFileAsBase64(file)
A -> API : interpretDiagramPhoto(base64, mediaType)
API -> C : interpretPhoto(dto) [POST /ai/interpret-photo]
C -> AI : interpretDiagramPhoto(imageBase64, mediaType)
AI -> H : interpretDiagramPhoto(imageBase64, mediaType)
H --> AI : clases y relaciones (JSON)
AI --> C : modelo reconocido
C --> API : 200
API --> A : modelo
A -> A : pushHistory()
A -> M : edgeAppearance(rel.type)
A --> U : clases nuevas en el lienzo
''')


def main():
    os.makedirs(OUT, exist_ok=True)
    for n, (titulo, cuerpo) in D.items():
        texto = (f'@startuml seq_cu{n}\n!include ../2do_parcial/pud/_seq.iuml\n'
                 f'title CU{n} — {titulo}{SUB}\n{cuerpo.strip()}\n@enduml\n')
        with open(os.path.join(OUT, f'seq_cu{n}.plantuml'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(texto)
    print(len(D), 'secuencias en', OUT)


if __name__ == '__main__':
    main()
