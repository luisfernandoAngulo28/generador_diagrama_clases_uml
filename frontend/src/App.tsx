import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';
import {
  Plus,
  LayoutTemplate,
  Workflow,
  Grid3x3,
  Undo2,
  Redo2,
  FolderOpen,
  Upload,
  Download,
  Save,
  ShieldCheck,
  Server,
  FileText,
  Camera,
  Link2,
  Users,
  HelpCircle,
  X,
} from 'lucide-react';
import { UmlClassNode, type UmlClassNodeData } from './components/UmlClassNode';
import { layoutNodes } from './lib/layout';
import { ClassInspector } from './components/ClassInspector';
import { FeaturesPanel } from './components/FeaturesPanel';
import { RelationInspector } from './components/RelationInspector';
import { ClassTreePanel } from './components/ClassTreePanel';
import { ChatPanel } from './components/ChatPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { DiagramsListPanel } from './components/DiagramsListPanel';
import { TemplatesPanel } from './components/TemplatesPanel';
import type { DiagramTemplate } from './lib/templates';
import { Tour, type TourStep } from './components/Tour';
import type {
  DiagramOperation,
  RelationType,
  UmlClass,
  UmlModel,
  ValidationResult,
} from './types/uml';
import { RELATION_LABELS, DASHED_RELATION_TYPES } from './types/uml';
import {
  createDiagram,
  downloadGeneratedBackend,
  downloadXmi,
  getDiagram,
  importXmi,
  interpretDiagramPhoto,
  openDocumentation,
  updateDiagram,
  validateDiagram,
} from './api/client';
import { getSocket } from './api/socket';

const nodeTypes = { umlClass: UmlClassNode };

interface HistorySnapshot {
  nodes: Node<UmlClassNodeData>[];
  edges: Edge[];
}

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

/** Dashed stroke for Dependency relations, matching standard UML notation. */
function edgeStyle(type: RelationType): { strokeDasharray?: string } | undefined {
  return DASHED_RELATION_TYPES.has(type) ? { strokeDasharray: '5 5' } : undefined;
}

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
  const { fitView, setCenter } = useReactFlow();
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState('Mi Diagrama');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [nextRelationType, setNextRelationType] = useState<RelationType>('ASSOCIATION');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingXmi, setExportingXmi] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [importingXmi, setImportingXmi] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [locks, setLocks] = useState<Record<string, string>>({});
  const [showDiagramsList, setShowDiagramsList] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

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
  const xmiInputRef = useRef<HTMLInputElement | null>(null);
  const diagramIdRef = useRef<string | null>(null);
  const locksRef = useRef<Record<string, string>>({});
  const myLocksRef = useRef<Set<string>>(new Set());
  const nodesRef = useRef<Node<UmlClassNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  useEffect(() => {
    diagramIdRef.current = diagramId;
  }, [diagramId]);

  useEffect(() => {
    locksRef.current = locks;
  }, [locks]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Snapshots the current diagram into the undo stack and clears redo —
  // call this BEFORE making a structural change (add/delete/connect/AI
  // edit/etc). Reads from refs (not closure state) so it stays correct
  // even from stable-identity callbacks like handleEditClass.
  function pushHistory() {
    setPast((p) => [...p, { nodes: nodesRef.current, edges: edgesRef.current }].slice(-50));
    setFuture([]);
  }

  function undo() {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [...f, { nodes: nodesRef.current, edges: edgesRef.current }]);
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return p.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setPast((p) => [...p, { nodes: nodesRef.current, edges: edgesRef.current }]);
      setNodes(next.nodes);
      setEdges(next.edges);
      return f.slice(0, -1);
    });
  }

  // Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) undo/redo, ignored while typing in a
  // text field so it doesn't fight the browser's native input undo.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping || !(e.ctrlKey || e.metaKey)) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Releases a class lock I hold (no-op if I don't hold it or there's no
  // room to notify yet). Kept as a plain function (not state-dependent) so
  // it can be called from callbacks with stable identities.
  function releaseLock(classId: string | null) {
    if (!classId || !myLocksRef.current.has(classId)) return;
    myLocksRef.current.delete(classId);
    const currentDiagramId = diagramIdRef.current;
    if (currentDiagramId) {
      getSocket().emit('unlock-class', { diagramId: currentDiagramId, classId });
    }
  }

  const handleEditClass = useCallback((classId: string) => {
    const lockedByOther = locksRef.current[classId];
    if (lockedByOther && !myLocksRef.current.has(classId)) {
      window.alert(
        `${lockedByOther} está editando esta clase ahora mismo. Intenta de nuevo en un momento.`,
      );
      return;
    }
    const currentDiagramId = diagramIdRef.current;
    if (currentDiagramId) {
      getSocket().emit('lock-class', { diagramId: currentDiagramId, classId });
      myLocksRef.current.add(classId);
    }
    pushHistory();
    setEditingClassId(classId);
  }, []);

  const loadDiagram = useCallback(async (id: string) => {
    const diagram = await getDiagram(id);
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
        data: { type: rel.type, sourceRole: rel.sourceRole, targetRole: rel.targetRole },
        style: edgeStyle(rel.type),
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    );
    setDiagramId(diagram.id);
    setPast([]);
    setFuture([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load an existing diagram when opened via a shared link (?diagram=<id>).
  useEffect(() => {
    const sharedId = new URLSearchParams(window.location.search).get('diagram');
    if (!sharedId) return;
    loadDiagram(sharedId);
    // Runs once on mount only; loadDiagram is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDiagramFromList(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('diagram', id);
    window.history.replaceState({}, '', url);
    loadDiagram(id);
    setShowDiagramsList(false);
  }

  async function handleXmiSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportingXmi(true);
    try {
      const xml = await file.text();
      const diagram = await importXmi(xml);
      openDiagramFromList(diagram.id);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      window.alert(
        Array.isArray(message)
          ? message.join('\n')
          : (message ?? 'No se pudo importar el archivo XMI. Verifica que sea un archivo válido.'),
      );
    } finally {
      setImportingXmi(false);
    }
  }

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

    function handleLocksUpdate(data: Record<string, { editorName: string }>) {
      setLocks(Object.fromEntries(Object.entries(data).map(([id, l]) => [id, l.editorName])));
    }

    socket.on('diagram-update', handleRemoteUpdate);
    socket.on('presence', handlePresence);
    socket.on('locks-update', handleLocksUpdate);

    return () => {
      socket.off('diagram-update', handleRemoteUpdate);
      socket.off('presence', handlePresence);
      socket.off('locks-update', handleLocksUpdate);
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
    pushHistory();
    const umlClass = createDefaultClass();
    const newNode: Node<UmlClassNodeData> = {
      id: umlClass.id,
      type: 'umlClass',
      position: { x: 120 + Math.random() * 300, y: 80 + Math.random() * 300 },
      data: { umlClass, onEdit: handleEditClass },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function applyTemplate(template: DiagramTemplate) {
    pushHistory();
    const columnOffset = nodes.length;
    const ids = template.classes.map(() => crypto.randomUUID());

    const newNodes: Node<UmlClassNodeData>[] = template.classes.map((cls, index) => ({
      id: ids[index],
      type: 'umlClass',
      position: {
        x: 120 + ((columnOffset + index) % 4) * 260,
        y: 80 + Math.floor((columnOffset + index) / 4) * 220,
      },
      data: {
        umlClass: { id: ids[index], name: cls.name, attributes: cls.attributes },
        onEdit: handleEditClass,
      },
    }));

    const newEdges: Edge[] = template.relations.map((rel) => ({
      id: crypto.randomUUID(),
      source: ids[rel.source],
      target: ids[rel.target],
      label: RELATION_LABELS[rel.type],
      data: { type: rel.type },
      style: edgeStyle(rel.type),
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    setShowTemplates(false);
  }

  function autoLayout() {
    pushHistory();
    setNodes((nds) => layoutNodes(nds, edges));
    requestAnimationFrame(() => fitView({ duration: 300 }));
  }

  function focusClass(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const width = node.measured?.width ?? 200;
    const height = node.measured?.height ?? 100;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: 1,
      duration: 400,
    });
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
    pushHistory();
    setNodes((nds) => nds.filter((n) => n.id !== classId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== classId && e.target !== classId),
    );
    releaseLock(classId);
    setEditingClassId(null);
  }

  function applyOperations(operations: DiagramOperation[]) {
    pushHistory();
    let workingNodes = nodes;
    let workingEdges = edges;
    let didAutoLayout = false;

    const findNodeByName = (name: string) =>
      workingNodes.find((n) => n.data.umlClass.name === name);

    for (const op of operations) {
      switch (op.op) {
        case 'CREATE_CLASS': {
          const umlClass: UmlClass = {
            id: crypto.randomUUID(),
            name: op.name,
            attributes:
              op.attributes && op.attributes.length > 0
                ? op.attributes
                : [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          };
          const newNode: Node<UmlClassNodeData> = {
            id: umlClass.id,
            type: 'umlClass',
            position: { x: 120 + Math.random() * 400, y: 80 + Math.random() * 300 },
            data: { umlClass, onEdit: handleEditClass },
          };
          workingNodes = [...workingNodes, newNode];
          break;
        }
        case 'DELETE_CLASS': {
          const target = findNodeByName(op.className);
          if (!target) break;
          workingNodes = workingNodes.filter((n) => n.id !== target.id);
          workingEdges = workingEdges.filter(
            (e) => e.source !== target.id && e.target !== target.id,
          );
          break;
        }
        case 'RENAME_CLASS': {
          const target = findNodeByName(op.className);
          if (!target) break;
          workingNodes = workingNodes.map((n) =>
            n.id === target.id
              ? { ...n, data: { ...n.data, umlClass: { ...n.data.umlClass, name: op.newName } } }
              : n,
          );
          break;
        }
        case 'ADD_ATTRIBUTE': {
          const target = findNodeByName(op.className);
          if (!target) break;
          workingNodes = workingNodes.map((n) =>
            n.id === target.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    umlClass: {
                      ...n.data.umlClass,
                      attributes: [...n.data.umlClass.attributes, op.attribute],
                    },
                  },
                }
              : n,
          );
          break;
        }
        case 'REMOVE_ATTRIBUTE': {
          const target = findNodeByName(op.className);
          if (!target) break;
          workingNodes = workingNodes.map((n) =>
            n.id === target.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    umlClass: {
                      ...n.data.umlClass,
                      attributes: n.data.umlClass.attributes.filter(
                        (a) => a.name !== op.attributeName,
                      ),
                    },
                  },
                }
              : n,
          );
          break;
        }
        case 'CREATE_RELATION': {
          const source = findNodeByName(op.sourceClassName);
          const target = findNodeByName(op.targetClassName);
          if (!source || !target) break;
          const newEdge: Edge = {
            id: crypto.randomUUID(),
            source: source.id,
            target: target.id,
            label: RELATION_LABELS[op.type],
            data: { type: op.type },
            style: edgeStyle(op.type),
            markerEnd: { type: MarkerType.ArrowClosed },
          };
          workingEdges = [...workingEdges, newEdge];
          break;
        }
        case 'DELETE_RELATION': {
          const source = findNodeByName(op.sourceClassName);
          const target = findNodeByName(op.targetClassName);
          if (!source || !target) break;
          workingEdges = workingEdges.filter(
            (e) => !(e.source === source.id && e.target === target.id),
          );
          break;
        }
        case 'AUTO_LAYOUT': {
          workingNodes = layoutNodes(workingNodes, workingEdges);
          didAutoLayout = true;
          break;
        }
      }
    }

    setNodes(workingNodes);
    setEdges(workingEdges);
    if (didAutoLayout) {
      requestAnimationFrame(() => fitView({ duration: 300 }));
    }
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      const label = RELATION_LABELS[nextRelationType];
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            label,
            data: { type: nextRelationType },
            style: edgeStyle(nextRelationType),
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
        sourceRole: (e.data?.sourceRole as string) || undefined,
        targetRole: (e.data?.targetRole as string) || undefined,
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

      pushHistory();
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
          style: edgeStyle(rel.type),
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

  async function openDocs() {
    const id = diagramId ?? (await saveDiagram());
    setGeneratingDocs(true);
    try {
      await openDocumentation(id);
    } finally {
      setGeneratingDocs(false);
    }
  }

  const editingClass = nodes.find((n) => n.id === editingClassId)?.data.umlClass;

  const editingEdgeRaw = edges.find((e) => e.id === editingEdgeId);
  const editingEdge = editingEdgeRaw
    ? {
        id: editingEdgeRaw.id,
        type: ((editingEdgeRaw.data?.type as RelationType) ?? 'ASSOCIATION') as RelationType,
        sourceClassName:
          nodes.find((n) => n.id === editingEdgeRaw.source)?.data.umlClass.name ?? '?',
        targetClassName:
          nodes.find((n) => n.id === editingEdgeRaw.target)?.data.umlClass.name ?? '?',
        sourceRole: (editingEdgeRaw.data?.sourceRole as string) ?? '',
        targetRole: (editingEdgeRaw.data?.targetRole as string) ?? '',
      }
    : null;

  function updateEdgeRelation(
    patch: Partial<{ type: RelationType; sourceRole: string; targetRole: string }>,
  ) {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== editingEdgeId) return e;
        const newType = patch.type ?? (e.data?.type as RelationType) ?? 'ASSOCIATION';
        return {
          ...e,
          label: RELATION_LABELS[newType],
          style: edgeStyle(newType),
          data: { ...e.data, ...patch, type: newType },
        };
      }),
    );
  }

  function deleteRelation(edgeId: string) {
    pushHistory();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setEditingEdgeId(null);
  }

  return (
    <div className="app">
      <header className="toolbar">
        <input
          data-tour="diagram-name"
          className="toolbar__diagram-name"
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
        />

        <div className="toolbar__group">
          <button className="toolbar__btn" data-tour="add-class" onClick={addClass}>
            <Plus size={15} /> Clase
          </button>
          <button className="toolbar__btn" onClick={() => setShowTemplates(true)}>
            <LayoutTemplate size={15} /> Plantillas
          </button>
          <button
            className="toolbar__btn"
            data-tour="auto-layout"
            onClick={autoLayout}
            disabled={nodes.length === 0}
          >
            <Workflow size={15} /> Auto-organizar
          </button>
          <button
            className={
              snapToGrid ? 'toolbar__btn toolbar__toggle--active' : 'toolbar__btn'
            }
            onClick={() => setSnapToGrid((v) => !v)}
            title="Ajustar las clases a una cuadrícula al moverlas"
            aria-pressed={snapToGrid}
          >
            <Grid3x3 size={15} /> Cuadrícula
          </button>
          <button
            className="toolbar__btn"
            onClick={undo}
            disabled={past.length === 0}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={15} /> Deshacer
          </button>
          <button
            className="toolbar__btn"
            onClick={redo}
            disabled={future.length === 0}
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 size={15} /> Rehacer
          </button>
        </div>

        <span className="toolbar__divider" />

        <div className="toolbar__group">
          <button className="toolbar__btn" onClick={() => setShowDiagramsList(true)}>
            <FolderOpen size={15} /> Mis diagramas
          </button>
          <input
            ref={xmiInputRef}
            type="file"
            accept=".xmi,.xml,application/xml,text/xml"
            style={{ display: 'none' }}
            onChange={(e) => void handleXmiSelected(e)}
          />
          <button
            className="toolbar__btn"
            onClick={() => xmiInputRef.current?.click()}
            disabled={importingXmi}
            title="Importar un diagrama desde un archivo XMI (exportado por esta u otra herramienta UML)"
          >
            <Upload size={15} /> {importingXmi ? 'Importando…' : 'Importar XMI'}
          </button>
          <button className="toolbar__btn" onClick={() => void saveDiagram()} disabled={saving}>
            <Save size={15} /> {saving ? 'Guardando…' : 'Guardar diagrama'}
          </button>
        </div>

        <span className="toolbar__divider" />

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

        <span className="toolbar__divider" />

        <div className="toolbar__group">
          <button
            className="toolbar__btn"
            data-tour="validate"
            onClick={() => void validateCurrentDiagram()}
            disabled={validating}
          >
            <ShieldCheck size={15} /> {validating ? 'Validando…' : 'Validar diagrama'}
          </button>
          <button
            className="toolbar__btn"
            data-tour="generate-backend"
            onClick={() => void generateBackend()}
            disabled={generating}
          >
            <Server size={15} /> {generating ? 'Generando…' : 'Generar backend Spring Boot'}
          </button>
          <button
            className="toolbar__btn"
            data-tour="export-xmi"
            onClick={() => void exportXmi()}
            disabled={exportingXmi}
          >
            <Download size={15} /> {exportingXmi ? 'Exportando…' : 'Exportar XMI'}
          </button>
          <button
            className="toolbar__btn"
            data-tour="documentation"
            onClick={() => void openDocs()}
            disabled={generatingDocs}
          >
            <FileText size={15} /> {generatingDocs ? 'Generando…' : 'Documentación'}
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
            className="toolbar__btn"
            onClick={() => photoInputRef.current?.click()}
            disabled={analyzingPhoto}
          >
            <Camera size={15} /> {analyzingPhoto ? 'Analizando foto…' : 'Foto de pizarra'}
          </button>
        </div>

        {diagramId && (
          <>
            <span className="toolbar__divider" />
            <button className="toolbar__btn" onClick={() => void copyShareLink()}>
              <Link2 size={15} /> Copiar enlace
            </button>
            <span className="toolbar__presence">
              <Users size={13} /> {collaboratorCount} conectado{collaboratorCount === 1 ? '' : 's'}
            </span>
          </>
        )}

        <button className="toolbar__btn toolbar__help" onClick={() => setShowTour(true)}>
          <HelpCircle size={15} /> Recorrido
        </button>
      </header>

      {photoError && (
        <div className="photo-error">
          {photoError}
          <button onClick={() => setPhotoError(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="app__body">
        <ClassTreePanel nodes={nodes} onSelect={focusClass} />
        <div className="canvas-wrapper">
          <ReactFlow
            nodes={nodes.map((n) => ({
              ...n,
              data: {
                ...n.data,
                lockedBy: myLocksRef.current.has(n.id) ? undefined : locks[n.id],
              },
            }))}
            edges={edges}
            onNodesChange={(changes) => {
              if (changes.some((c) => c.type === 'remove')) pushHistory();
              onNodesChange(changes);
            }}
            onEdgesChange={(changes) => {
              if (changes.some((c) => c.type === 'remove')) pushHistory();
              onEdgesChange(changes);
            }}
            onConnect={onConnect}
            onNodeDragStart={() => pushHistory()}
            onEdgeClick={(_, edge) => {
              pushHistory();
              setEditingEdgeId(edge.id);
            }}
            nodeTypes={nodeTypes}
            snapToGrid={snapToGrid}
            snapGrid={[20, 20]}
            fitView
          >
            <Background gap={20} />
            <Controls />
            <MiniMap
              style={{ backgroundColor: '#1e1e1e' }}
              maskColor="rgba(0, 0, 0, 0.6)"
              nodeColor="#4a5568"
            />
          </ReactFlow>

          {editingClass && <FeaturesPanel umlClass={editingClass} onChange={updateClass} />}
        </div>

        {editingClass && (
          <ClassInspector
            umlClass={editingClass}
            onChange={updateClass}
            onClose={() => {
              releaseLock(editingClassId);
              setEditingClassId(null);
            }}
            onDelete={() => deleteClass(editingClass.id)}
          />
        )}

        {editingEdge && (
          <RelationInspector
            relation={editingEdge}
            onChange={updateEdgeRelation}
            onClose={() => setEditingEdgeId(null)}
            onDelete={() => deleteRelation(editingEdge.id)}
          />
        )}

        {validationResult && (
          <ValidationPanel
            result={validationResult}
            onClose={() => setValidationResult(null)}
          />
        )}

        <ChatPanel model={buildModel()} onApplyOperations={applyOperations} />
      </div>

      {showTour && <Tour steps={TOUR_STEPS} onFinish={finishTour} />}
      {showDiagramsList && (
        <DiagramsListPanel
          onOpen={openDiagramFromList}
          onClose={() => setShowDiagramsList(false)}
        />
      )}
      {showTemplates && (
        <TemplatesPanel onApply={applyTemplate} onClose={() => setShowTemplates(false)} />
      )}
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
