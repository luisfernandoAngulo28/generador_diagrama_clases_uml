import { useCallback, useState } from 'react';
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
import type { RelationType, UmlClass, UmlModel } from './types/uml';
import { RELATION_LABELS } from './types/uml';
import { createDiagram, downloadGeneratedBackend, updateDiagram } from './api/client';

const nodeTypes = { umlClass: UmlClassNode };

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

  const handleEditClass = useCallback((classId: string) => {
    setEditingClassId(classId);
  }, []);

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
      classes: nodes.map((n) => n.data.umlClass),
      relations: edges.map((e) => ({
        id: e.id,
        type: (e.data?.type as RelationType) ?? 'ASSOCIATION',
        sourceClassId: e.source,
        targetClassId: e.target,
      })),
    };
  }

  async function saveDiagram() {
    setSaving(true);
    try {
      const model = buildModel();
      if (diagramId) {
        await updateDiagram(diagramId, diagramName, model);
      } else {
        const created = await createDiagram(diagramName, model);
        setDiagramId(created.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function generateBackend() {
    if (!diagramId) {
      await saveDiagram();
    }
    if (!diagramId) return;
    setGenerating(true);
    try {
      await downloadGeneratedBackend(diagramId);
    } finally {
      setGenerating(false);
    }
  }

  const editingClass = nodes.find((n) => n.id === editingClassId)?.data.umlClass;

  return (
    <div className="app">
      <header className="toolbar">
        <input
          className="toolbar__diagram-name"
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
        />
        <button onClick={addClass}>+ Clase</button>

        <select
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
        <button onClick={() => void generateBackend()} disabled={generating}>
          {generating ? 'Generando…' : 'Generar backend Spring Boot'}
        </button>
      </header>

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

        <ChatPanel />
      </div>
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
