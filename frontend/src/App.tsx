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
import type { RelationType, UmlClass, UmlModel } from './types/uml';
import { RELATION_LABELS } from './types/uml';
import {
  createDiagram,
  downloadGeneratedBackend,
  getDiagram,
  updateDiagram,
} from './api/client';
import { getSocket } from './api/socket';

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
  const [collaboratorCount, setCollaboratorCount] = useState(0);

  const isApplyingRemoteRef = useRef(false);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function saveDiagram() {
    setSaving(true);
    try {
      const model = buildModel();
      if (diagramId) {
        await updateDiagram(diagramId, diagramName, model);
      } else {
        const created = await createDiagram(diagramName, model);
        setDiagramId(created.id);
        const url = new URL(window.location.href);
        url.searchParams.set('diagram', created.id);
        window.history.replaceState({}, '', url);
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

        {diagramId && (
          <>
            <button onClick={() => void copyShareLink()}>🔗 Copiar enlace</button>
            <span className="toolbar__presence">
              🟢 {collaboratorCount} conectado{collaboratorCount === 1 ? '' : 's'}
            </span>
          </>
        )}
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
