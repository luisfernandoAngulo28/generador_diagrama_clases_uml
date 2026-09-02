import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';
import { UmlClassNode, type UmlClassNodeData } from './components/UmlClassNode';
import { ClassInspector } from './components/ClassInspector';
import { ChatPanel } from './components/ChatPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { Tour, type TourStep } from './components/Tour';
import type { RelationType, UmlClass, UmlModel, ValidationResult } from './types/uml';
import { RELATION_LABELS } from './types/uml';
import {
  createDiagram,
  downloadGeneratedBackend,
  downloadXmi,
  getDiagram,
  interpretDiagramPhoto,
  updateDiagram,
  validateDiagram,
} from './api/client';
import { getSocket } from './api/socket';

const nodeTypes = { umlClass: UmlClassNode };

const TOUR_SEEN_KEY = 'case-tool-tour-seen';

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="diagram-name"]',
    title: 'Dale un nombre a tu diagrama',
    body: 'Este es el nombre con el que se guarda tu diagrama de clases. Puedes cambiarlo en cualquier momento.',
  },
  {
    target: '[data-tour="add-class"]',
    title: 'Agrega una clase',
    body: 'Crea una nueva clase UML en el lienzo. Haz clic sobre ella para editar su nombre, atributos y clave primaria.',
  },
  {
    target: '[data-tour="relation-select"]',
    title: 'Elige el tipo de relación',
    body: 'Selecciona el tipo de relación (asociación, herencia, 1 a N, N a N, etc.) y luego arrastra desde el borde de una clase hasta otra para conectarlas.',
  },
  {
    target: '[data-tour="validate"]',
    title: 'Valida tu modelo',
    body: 'Revisa integridad estructural y normalización (3FN) antes de generar código: claves primarias faltantes, atributos duplicados, redundancias.',
  },
  {
    target: '[data-tour="generate-backend"]',
    title: 'Genera el backend Spring Boot',
    body: 'Con un clic, descarga un proyecto Spring Boot completo (4 capas, JPA/Hibernate) listo para conectar con tu app móvil.',
  },
  {
    target: '[data-tour="export-xmi"]',
    title: 'Exporta a XMI',
    body: 'Descarga el diagrama en formato XMI 2.1, importable directamente en Enterprise Architect u otras herramientas UML.',
  },
  {
    target: '.chat-panel',
    title: 'Asistente de IA',
    body: 'Pregúntale al asistente sobre modelado UML, buenas prácticas o pídele ayuda para interpretar tu diagrama. Responde solo temas de ingeniería de software.',
  },
];

function createDefaultClass(): UmlClass {
  const id = crypto.randomUUID();
  return {
    id,
    name: 'NuevaClase',
    attributes: [
      { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
    ],
  };
}

function AppInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<UmlClassNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState('Mi Diagrama');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [nextRelationType, setNextRelationType] = useState<RelationType>('ASSOCIATION');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingXmi, setExportingXmi] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(TOUR_SEEN_KEY)) {
      setShowTour(true);
    }
  }, []);

  function finishTour() {
    setShowTour(false);
    window.localStorage.setItem(TOUR_SEEN_KEY, '1');
  }

  const isApplyingRemoteRef = useRef(false);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const handleEditClass = useCallback((classId: string) => {
    setEditingClassId(classId);
  }, []);

  // Load an existing diagram when opened via a shared link (?diagram=<id>).
  useEffect(() => {
    const sharedId = new URLSearchParams(window.location.search).get('diagram');
    if (!sharedId) return;

    getDiagram(sharedId).then((diagram) => {
      setDiagramName(diagram.name);
      setNodes(
        diagram.model.classes.map((umlClass, index) => ({
          id: umlClass.id,
          type: 'umlClass',
          position: umlClass.position ?? {
            x: 120 + (index % 4) * 260,
            y: 80 + Math.floor(index / 4) * 220,
          },
          data: { umlClass, onEdit: handleEditClass },
        })),
      );
      setEdges(
        diagram.model.relations.map((rel) => ({
          id: rel.id,
          source: rel.sourceClassId,
          target: rel.targetClassId,
          label: RELATION_LABELS[rel.type],
          data: { type: rel.type },
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
      );
      setDiagramId(diagram.id);
    });
    // Runs once on mount only; handleEditClass/setNodes/setEdges are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join the diagram's collaboration room and react to remote changes.
  useEffect(() => {
    if (!diagramId) return;

    const socket = getSocket();
    socket.emit('join-diagram', diagramId);

    function handleRemoteUpdate(payload: { nodes: Node<UmlClassNodeData>[]; edges: Edge[] }) {
      isApplyingRemoteRef.current = true;
      setNodes(
        payload.nodes.map((n) => ({
          ...n,
          data: { ...n.data, onEdit: handleEditClass },
        })),
      );
      setEdges(payload.edges);
      requestAnimationFrame(() => {
        isApplyingRemoteRef.current = false;
      });
    }

    function handlePresence(data: { count: number }) {
      setCollaboratorCount(data.count);
    }

    socket.on('diagram-update', handleRemoteUpdate);
    socket.on('presence', handlePresence);

    return () => {
      socket.off('diagram-update', handleRemoteUpdate);
      socket.off('presence', handlePresence);
    };
  }, [diagramId, handleEditClass, setNodes, setEdges]);

  // Broadcast local changes to other collaborators (debounced).
  useEffect(() => {
    if (!diagramId || isApplyingRemoteRef.current) return;

    if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    emitTimerRef.current = setTimeout(() => {
      const socket = getSocket();
      const outgoingNodes = nodes.map((n) => ({
        ...n,
        data: { ...n.data, onEdit: undefined },
      }));
      socket.emit('diagram-update', { diagramId, nodes: outgoingNodes, edges });
    }, 400);

    return () => {
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    };
  }, [nodes, edges, diagramId]);

  function addClass() {
    const umlClass = createDefaultClass();
    const newNode: Node<UmlClassNodeData> = {
      id: umlClass.id,
      type: 'umlClass',
      position: { x: 120 + Math.random() * 300, y: 80 + Math.random() * 300 },
      data: { umlClass, onEdit: handleEditClass },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function updateClass(updated: UmlClass) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === updated.id
          ? { ...n, data: { ...n.data, umlClass: updated } }
          : n,
      ),
    );
  }

  function deleteClass(classId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== classId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== classId && e.target !== classId),
    );
    setEditingClassId(null);
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      const label = RELATION_LABELS[nextRelationType];
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            label,
            data: { type: nextRelationType },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      );
    },
    [nextRelationType, setEdges],
  );

  function buildModel(): UmlModel {
    return {
      classes: nodes.map((n) => ({ ...n.data.umlClass, position: n.position })),
      relations: edges.map((e) => ({
        id: e.id,
        type: (e.data?.type as RelationType) ?? 'ASSOCIATION',
        sourceClassId: e.source,
        targetClassId: e.target,
      })),
    };
  }

  async function saveDiagram(): Promise<string> {
    setSaving(true);
    try {
      const model = buildModel();
      if (diagramId) {
        await updateDiagram(diagramId, diagramName, model);
        return diagramId;
      } else {
        const created = await createDiagram(diagramName, model);
        setDiagramId(created.id);
        const url = new URL(window.location.href);
        url.searchParams.set('diagram', created.id);
        window.history.replaceState({}, '', url);
        return created.id;
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyShareLink() {
    if (!diagramId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('diagram', diagramId);
    await navigator.clipboard.writeText(url.toString());
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);
    setAnalyzingPhoto(true);
    try {
      const imageBase64 = await readFileAsBase64(file);
      const model = await interpretDiagramPhoto(imageBase64, file.type);

      if (model.classes.length === 0) {
        setPhotoError('No se reconoció ningún diagrama de clases en la foto.');
        return;
      }

      const idMap = new Map<string, string>();
      for (const cls of model.classes) idMap.set(cls.id, crypto.randomUUID());

      const columnOffset = nodes.length;
      const newNodes: Node<UmlClassNodeData>[] = model.classes.map((umlClass, index) => {
        const newId = idMap.get(umlClass.id)!;
        return {
          id: newId,
          type: 'umlClass',
          position: {
            x: 120 + ((columnOffset + index) % 4) * 260,
            y: 80 + Math.floor((columnOffset + index) / 4) * 220,
          },
          data: { umlClass: { ...umlClass, id: newId }, onEdit: handleEditClass },
        };
      });

      const newEdges: Edge[] = model.relations
        .filter((rel) => idMap.has(rel.sourceClassId) && idMap.has(rel.targetClassId))
        .map((rel) => ({
          id: crypto.randomUUID(),
          source: idMap.get(rel.sourceClassId)!,
          target: idMap.get(rel.targetClassId)!,
          label: RELATION_LABELS[rel.type],
          data: { type: rel.type },
          markerEnd: { type: MarkerType.ArrowClosed },
        }));

      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    } catch {
      setPhotoError('No se pudo interpretar la foto. Intenta con una imagen más clara.');
    } finally {
      setAnalyzingPhoto(false);
    }
  }

  async function generateBackend() {
    const id = diagramId ?? (await saveDiagram());
    setGenerating(true);
    try {
      await downloadGeneratedBackend(id);
    } finally {
      setGenerating(false);
    }
  }

  async function validateCurrentDiagram() {
    const id = diagramId ?? (await saveDiagram());
    setValidating(true);
    try {
      const result = await validateDiagram(id);
      setValidationResult(result);
    } finally {
      setValidating(false);
    }
  }

  async function exportXmi() {
    const id = diagramId ?? (await saveDiagram());
    setExportingXmi(true);
    try {
      await downloadXmi(id);
    } finally {
      setExportingXmi(false);
    }
  }

  const editingClass = nodes.find((n) => n.id === editingClassId)?.data.umlClass;

  return (
    <div className="app">
      <header className="toolbar">
        <input
          data-tour="diagram-name"
          className="toolbar__diagram-name"
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
        />
        <button data-tour="add-class" onClick={addClass}>
          + Clase
        </button>

        <select
          data-tour="relation-select"
          className="toolbar__relation-select"
          value={nextRelationType}
          onChange={(e) => setNextRelationType(e.target.value as RelationType)}
        >
          {Object.entries(RELATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button onClick={() => void saveDiagram()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar diagrama'}
        </button>
        <button
          data-tour="validate"
          onClick={() => void validateCurrentDiagram()}
          disabled={validating}
        >
          {validating ? 'Validando…' : '✅ Validar diagrama'}
        </button>
        <button
          data-tour="generate-backend"
          onClick={() => void generateBackend()}
          disabled={generating}
        >
          {generating ? 'Generando…' : 'Generar backend Spring Boot'}
        </button>
        <button data-tour="export-xmi" onClick={() => void exportXmi()} disabled={exportingXmi}>
          {exportingXmi ? 'Exportando…' : '📤 Exportar XMI'}
        </button>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => void handlePhotoSelected(e)}
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={analyzingPhoto}
        >
          {analyzingPhoto ? 'Analizando foto…' : '📷 Foto de pizarra'}
        </button>

        {diagramId && (
          <>
            <button onClick={() => void copyShareLink()}>🔗 Copiar enlace</button>
            <span className="toolbar__presence">
              🟢 {collaboratorCount} conectado{collaboratorCount === 1 ? '' : 's'}
            </span>
          </>
        )}

        <button className="toolbar__help" onClick={() => setShowTour(true)}>
          ❓ Recorrido
        </button>
      </header>

      {photoError && (
        <div className="photo-error">
          {photoError}
          <button onClick={() => setPhotoError(null)}>×</button>
        </div>
      )}

      <div className="app__body">
        <div className="canvas-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap
              style={{ backgroundColor: '#1e1e1e' }}
              maskColor="rgba(0, 0, 0, 0.6)"
              nodeColor="#4a5568"
            />
          </ReactFlow>
        </div>

        {editingClass && (
          <ClassInspector
            umlClass={editingClass}
            onChange={updateClass}
            onClose={() => setEditingClassId(null)}
            onDelete={() => deleteClass(editingClass.id)}
          />
        )}

        {validationResult && (
          <ValidationPanel
            result={validationResult}
            onClose={() => setValidationResult(null)}
          />
        )}

        <ChatPanel />
      </div>

      {showTour && <Tour steps={TOUR_STEPS} onFinish={finishTour} />}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
