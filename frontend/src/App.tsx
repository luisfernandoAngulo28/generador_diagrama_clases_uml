import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Image as ImageIcon,
  Trash2,
  User as UserIcon,
  LogOut,
  History,
  Paperclip,
  CheckCircle2,
  BarChart3,
  Code2,
  Send,
  Database,
  StickyNote,
  Keyboard,
  Layers,
  Search,
  Gauge,
  GitCommitHorizontal,
  BookOpenCheck,
  GitCompare,
  Terminal,
} from 'lucide-react';
import { UmlClassNode, type UmlClassNodeData } from './components/UmlClassNode';
import { UmlNoteNode } from './components/UmlNoteNode';
import { layoutNodes } from './lib/layout';
import { ClassInspector } from './components/ClassInspector';
import { FeaturesPanel } from './components/FeaturesPanel';
import { RelationInspector } from './components/RelationInspector';
import { ClassTreePanel } from './components/ClassTreePanel';
import { ChatPanel } from './components/ChatPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { DiagramsListPanel } from './components/DiagramsListPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { AttachmentsPanel } from './components/AttachmentsPanel';
import { TemplatesPanel } from './components/TemplatesPanel';
import { CodePreviewModal } from './components/CodePreviewModal';
import { SpotlightSearchModal } from './components/SpotlightSearchModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { MetricsModal } from './components/MetricsModal';
import { SequenceDiagramModal } from './components/SequenceDiagramModal';
import { UserStoriesModal } from './components/UserStoriesModal';
import { DiffModal } from './components/DiffModal';
import { MockApiModal } from './components/MockApiModal';
import { ToastProvider, useToast } from './context/ToastContext';
import { CanvasEmptyState } from './components/CanvasEmptyState';
import { ContextMenu, type ContextMenuData } from './components/ContextMenu';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { ProfileModal } from './components/ProfileModal';
import { StatusBar } from './components/StatusBar';
import type { DiagramTemplate } from './lib/templates';
import { Tour, type TourStep } from './components/Tour';
import { ToolbarMenu } from './components/ToolbarMenu';
import { exportDiagramAsImage } from './lib/exportImage';
import { exportPostmanCollection } from './lib/postmanExport';
import { exportSqlSchema } from './lib/sqlExport';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './context/AuthContext';
import { UmlMarkerDefs } from './components/UmlMarkerDefs';
import { UmlLegend } from './components/UmlLegend';
import { UmlRelationEdge } from './components/UmlRelationEdge';
import { edgeAppearance } from './lib/multiplicity';
import type {
  DiagramOperation,
  RelationType,
  UmlClass,
  UmlModel,
  ValidationResult,
} from './types/uml';
import { RELATION_LABELS } from './types/uml';
import {
  createDiagram,
  downloadGeneratedBackend,
  downloadXmi,
  getDiagram,
  importXmi,
  interpretDiagramPhoto,
  openDocumentation,
  previewGeneratedCode,
  type CodePreviewResult,
  updateDiagram,
  validateDiagram,
} from './api/client';
import { getSocket } from './api/socket';

const nodeTypes = { umlClass: UmlClassNode, umlNote: UmlNoteNode };
const edgeTypes = { umlRelation: UmlRelationEdge };

interface HistorySnapshot {
  nodes: Node<any>[];
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
  const { user, logout } = useAuth();
  const toast = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, setCenter, getNodes, getNodesBounds, deleteElements, screenToFlowPosition } = useReactFlow();
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState('Mi Diagrama');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [nextRelationType, setNextRelationType] = useState<RelationType>('ASSOCIATION');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingXmi, setExportingXmi] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [importingXmi, setImportingXmi] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [locks, setLocks] = useState<Record<string, string>>({});
  const [showDiagramsList, setShowDiagramsList] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [codePreview, setCodePreview] = useState<CodePreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'uml' | 'der'>('uml');
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showSequence, setShowSequence] = useState(false);
  const [sequenceTargetClass, setSequenceTargetClass] = useState<string | undefined>(undefined);
  const [showStories, setShowStories] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showMockApi, setShowMockApi] = useState(false);
  const [mockApiTargetClass, setMockApiTargetClass] = useState<string | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  const initialModelFromPast = useMemo<UmlModel | undefined>(() => {
    if (past.length === 0) return undefined;
    const first = past[0];
    const classNodes = first.nodes.filter((n) => n.data?.umlClass);
    return {
      classes: classNodes.map((n) => ({ ...n.data.umlClass, position: n.position })),
      relations: first.edges.map((e) => ({
        id: e.id,
        type: (e.data?.type as RelationType) ?? 'ASSOCIATION',
        sourceClassId: e.source,
        targetClassId: e.target,
      })),
    };
  }, [past]);

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
  const nodesRef = useRef<Node<any>[]>([]);
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

  // Ctrl+Z / Ctrl+Y undo/redo, Ctrl+F spotlight search, ? shortcuts guide
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSpotlight(true);
        return;
      }

      if (!isTyping && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

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
    const classNodes: Node<any>[] = diagram.model.classes.map((umlClass, index) => ({
      id: umlClass.id,
      type: 'umlClass',
      position: umlClass.position ?? {
        x: 120 + (index % 4) * 260,
        y: 80 + Math.floor(index / 4) * 220,
      },
      data: { umlClass, onEdit: handleEditClass },
    }));
    const noteNodes: Node<any>[] = (diagram.model.notes ?? []).map((note, index) => ({
      id: note.id,
      type: 'umlNote',
      position: note.position ?? {
        x: 400 + (index % 3) * 220,
        y: 100 + Math.floor(index / 3) * 180,
      },
      data: {
        title: note.title,
        text: note.text,
      },
    }));
    setNodes([...classNodes, ...noteNodes]);
    setEdges(
      diagram.model.relations.map((rel) => ({
        id: rel.id,
        source: rel.sourceClassId,
        target: rel.targetClassId,
        type: 'umlRelation' as const,
        data: { type: rel.type, sourceRole: rel.sourceRole, targetRole: rel.targetRole },
        ...edgeAppearance(rel.type),
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
    setConnected(socket.connected);
    const onConnectSocket = () => setConnected(true);
    const onDisconnectSocket = () => setConnected(false);
    socket.on('connect', onConnectSocket);
    socket.on('disconnect', onDisconnectSocket);
    socket.emit('join-diagram', { diagramId, userName: user?.name });

    function handleRemoteUpdate(payload: { nodes: Node<any>[]; edges: Edge[] }) {
      isApplyingRemoteRef.current = true;
      setNodes(
        payload.nodes.map((n) => {
          if (n.type === 'umlNote') return n;
          return {
            ...n,
            data: { ...n.data, onEdit: handleEditClass },
          };
        }),
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
      socket.off('connect', onConnectSocket);
      socket.off('disconnect', onDisconnectSocket);
      socket.off('diagram-update', handleRemoteUpdate);
      socket.off('presence', handlePresence);
      socket.off('locks-update', handleLocksUpdate);
    };
  }, [diagramId, handleEditClass, setNodes, setEdges, user]);

  // Broadcast local changes to other collaborators (debounced).
  useEffect(() => {
    if (!diagramId || isApplyingRemoteRef.current) return;

    if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    emitTimerRef.current = setTimeout(() => {
      const socket = getSocket();
      const outgoingNodes = nodes.map((n) => {
        if (n.type === 'umlNote') return n;
        return {
          ...n,
          data: { ...n.data, onEdit: undefined },
        };
      });
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
    toast.success(`Clase "${umlClass.name}" añadida al lienzo`, 'Nueva Clase');
  }

  const addClassAt = useCallback((x: number, y: number) => {
    pushHistory();
    const umlClass = createDefaultClass();
    const newNode: Node<UmlClassNodeData> = {
      id: umlClass.id,
      type: 'umlClass',
      position: { x, y },
      data: { umlClass, onEdit: handleEditClass },
    };
    setNodes((nds) => [...nds, newNode]);
    handleEditClass(umlClass.id);
    toast.success(`Clase "${umlClass.name}" creada`, 'Nueva Clase');
  }, [handleEditClass, toast]);

  const addNoteAt = useCallback((x: number, y: number) => {
    pushHistory();
    const id = crypto.randomUUID();
    const newNote: Node<any> = {
      id,
      type: 'umlNote',
      position: { x, y },
      data: { title: 'Nota', text: 'Escribe tu nota aquí…' },
    };
    setNodes((nds) => [...nds, newNote]);
    toast.info('Nota adhesiva creada', 'Nota');
  }, [toast]);

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const clientX = 'clientX' in event ? event.clientX : 100;
      const clientY = 'clientY' in event ? event.clientY : 100;
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setContextMenu({
        type: 'canvas',
        x: clientX,
        y: clientY,
        canvasX: flowPos.x,
        canvasY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<any>) => {
      event.preventDefault();
      if (!node.data?.umlClass) return;
      setContextMenu({
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        umlClass: node.data.umlClass,
      });
    },
    []
  );

  function addNote() {
    pushHistory();
    const newNoteId = crypto.randomUUID();
    const newNoteNode: Node<any> = {
      id: newNoteId,
      type: 'umlNote',
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        title: 'Nota',
        text: 'Escribe tu nota aquí...',
      },
    };
    setNodes((nds) => [...nds, newNoteNode]);
    toast.info('Nota adhesiva añadida');
  }

  function updateNoteText(id: string, text: string) {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text } } : n)),
    );
  }

  function deleteNote(id: string) {
    pushHistory();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
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
      type: 'umlRelation' as const,
      data: { type: rel.type },
      ...edgeAppearance(rel.type),
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

  function duplicateClass(classId: string) {
    const target = nodes.find((n) => n.id === classId);
    if (!target || !target.data?.umlClass) return;
    pushHistory();
    const newId = crypto.randomUUID();
    const clonedUmlClass: UmlClass = {
      ...target.data.umlClass,
      id: newId,
      name: `${target.data.umlClass.name}Copia`,
      attributes: target.data.umlClass.attributes.map((a: any) => ({ ...a })),
      operations: target.data.umlClass.operations?.map((o: any) => ({ ...o })),
    };
    const newNode: Node<UmlClassNodeData> = {
      id: newId,
      type: 'umlClass',
      position: { x: target.position.x + 30, y: target.position.y + 30 },
      data: { umlClass: clonedUmlClass, onEdit: handleEditClass },
    };
    setNodes((nds) => [...nds, newNode]);
    handleEditClass(newId);
  }

  function applyOperations(operations: DiagramOperation[]) {
    pushHistory();
    let workingNodes = nodes;
    let workingEdges = edges;
    let didAutoLayout = false;

    const findNodeByName = (name: string) =>
      workingNodes.find((n) => n.data?.umlClass?.name === name);

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
                        (a: any) => a.name !== op.attributeName,
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
            type: 'umlRelation',
            data: { type: op.type },
            ...edgeAppearance(op.type),
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
          didAutoLayout = true;
          break;
        }
      }
    }

    if (didAutoLayout) {
      workingNodes = layoutNodes(workingNodes, workingEdges);
      requestAnimationFrame(() => fitView({ duration: 300 }));
    }

    setNodes(workingNodes);
    setEdges(workingEdges);
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            type: 'umlRelation',
            data: { type: nextRelationType },
            ...edgeAppearance(nextRelationType),
          },
          eds,
        ),
      );
    },
    [nextRelationType, setEdges],
  );

  function buildModel(): UmlModel {
    const classNodes = nodes.filter((n) => n.data?.umlClass);
    const noteNodes = nodes.filter((n) => n.type === 'umlNote');
    return {
      classes: classNodes.map((n) => ({ ...n.data.umlClass, position: n.position })),
      relations: edges.map((e) => ({
        id: e.id,
        type: (e.data?.type as RelationType) ?? 'ASSOCIATION',
        sourceClassId: e.source,
        targetClassId: e.target,
        sourceRole: (e.data?.sourceRole as string) || undefined,
        targetRole: (e.data?.targetRole as string) || undefined,
      })),
      notes: noteNodes.map((n) => ({
        id: n.id,
        text: n.data?.text ?? '',
        title: n.data?.title,
        position: n.position,
      })),
    };
  }

  async function saveDiagram(isAuto = false): Promise<string | undefined> {
    if (!isAuto) setSaving(true);
    try {
      const model = buildModel();
      if (diagramId) {
        await updateDiagram(diagramId, diagramName, model);
        setLastSavedAt(new Date());
        if (!isAuto) toast.success(`"${diagramName}" guardado correctamente`, 'Guardado');
        return diagramId;
      } else {
        const created = await createDiagram(diagramName, model);
        setDiagramId(created.id);
        setLastSavedAt(new Date());
        if (!isAuto) toast.success(`"${diagramName}" creado y guardado`, 'Nuevo Diagrama');
        return created.id;
      }
    } catch (err) {
      if (!isAuto) throw err;
    } finally {
      if (!isAuto) setSaving(false);
    }
  }

  // Auto-guardado periódico cada 30 segundos si hay un diagrama abierto y guardado
  useEffect(() => {
    if (!diagramId || nodes.length === 0) return;
    const interval = setInterval(() => {
      void saveDiagram(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [diagramId, nodes, edges, diagramName]);

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
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAnalyzingPhoto(true);
    setPhotoError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const recognized = await interpretDiagramPhoto(base64, file.type || 'image/jpeg');

      if (recognized.classes.length === 0) {
        setPhotoError(
          'La IA no detectó clases en la foto. Intenta con una toma más cercana, con buena luz y trazos legibles.',
        );
        return;
      }

      pushHistory();

      const idMap = new Map<string, string>();
      const columnOffset = nodes.length;

      const newNodes: Node<UmlClassNodeData>[] = recognized.classes.map((cls, index) => {
        const newId = crypto.randomUUID();
        idMap.set(cls.id, newId);
        return {
          id: newId,
          type: 'umlClass',
          position: {
            x: 120 + ((columnOffset + index) % 4) * 260,
            y: 80 + Math.floor((columnOffset + index) / 4) * 220,
          },
          data: {
            umlClass: { ...cls, id: newId },
            onEdit: handleEditClass,
          },
        };
      });

      const newEdges: Edge[] = recognized.relations
        .filter((rel) => idMap.has(rel.sourceClassId) && idMap.has(rel.targetClassId))
        .map((rel) => ({
          id: crypto.randomUUID(),
          source: idMap.get(rel.sourceClassId)!,
          target: idMap.get(rel.targetClassId)!,
          type: 'umlRelation' as const,
          data: { type: rel.type },
          ...edgeAppearance(rel.type),
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
    if (!id) return;
    setGenerating(true);
    try {
      await downloadGeneratedBackend(id);
    } finally {
      setGenerating(false);
    }
  }

  async function validateCurrentDiagram() {
    const id = diagramId ?? (await saveDiagram());
    if (!id) return;
    setValidating(true);
    try {
      const result = await validateDiagram(id);
      setValidationResult(result);
    } finally {
      setValidating(false);
    }
  }

  async function handleOpenCodePreview(_targetClassName?: string) {
    if (nodes.length === 0) return;
    setLoadingPreview(true);
    try {
      const model = buildModel();
      const result = await previewGeneratedCode(model, diagramName);
      setCodePreview(result);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al previsualizar el código.');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function exportXmi() {
    const id = diagramId ?? (await saveDiagram());
    if (!id) return;
    setExportingXmi(true);
    try {
      await downloadXmi(id);
    } finally {
      setExportingXmi(false);
    }
  }

  async function openDocs() {
    const id = diagramId ?? (await saveDiagram());
    if (!id) return;
    setGeneratingDocs(true);
    try {
      await openDocumentation(id);
    } finally {
      setGeneratingDocs(false);
    }
  }

  async function handleExportImage(format: 'png' | 'svg') {
    setExportingImage(true);
    try {
      const fileName =
        diagramName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
        'diagrama';
      const bounds = getNodes().length > 0 ? getNodesBounds(getNodes()) : null;
      await exportDiagramAsImage(bounds, format, fileName);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo exportar la imagen.');
    } finally {
      setExportingImage(false);
    }
  }

  const editingClass = nodes.find((n) => n.id === editingClassId)?.data?.umlClass;

  const editingEdgeRaw = edges.find((e) => e.id === editingEdgeId);
  const editingEdge = editingEdgeRaw
    ? {
        id: editingEdgeRaw.id,
        type: ((editingEdgeRaw.data?.type as RelationType) ?? 'ASSOCIATION') as RelationType,
        sourceClassName:
          nodes.find((n) => n.id === editingEdgeRaw.source)?.data?.umlClass?.name ?? '?',
        targetClassName:
          nodes.find((n) => n.id === editingEdgeRaw.target)?.data?.umlClass?.name ?? '?',
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
          ...edgeAppearance(newType),
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

  async function deleteSelectedClasses() {
    if (selectedNodeIds.length === 0) return;
    // pushHistory() is not called here: deleteElements() routes through the
    // controlled onNodesChange/onEdgesChange handlers below, which already
    // push history for 'remove' changes.
    await deleteElements({ nodes: selectedNodeIds.map((id) => ({ id })) });
    setSelectedNodeIds([]);
  }

  const stats = useMemo(() => {
    const classNodes = nodes.filter((n) => n.data?.umlClass);
    const totalAttrs = classNodes.reduce(
      (sum, n) => sum + (n.data.umlClass.attributes?.length ?? 0),
      0,
    );
    const totalOps = classNodes.reduce(
      (sum, n) => sum + (n.data.umlClass.operations?.length ?? 0),
      0,
    );
    return {
      classes: classNodes.length,
      relations: edges.length,
      attributes: totalAttrs,
      operations: totalOps,
    };
  }, [nodes, edges]);

  const errorClassIds = useMemo(() => {
    if (!validationResult) return new Set<string>();
    const ids = new Set<string>();
    for (const item of [...validationResult.errors, ...validationResult.warnings]) {
      if (item.classId) ids.add(item.classId);
      if (item.className) {
        const match = nodes.find((n) => n.data?.umlClass?.name === item.className);
        if (match) ids.add(match.id);
      }
    }
    return ids;
  }, [validationResult, nodes]);

  return (
    <div className="app">
      <header className="toolbar">
        <input
          data-tour="diagram-name"
          className="toolbar__diagram-name"
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
        />

        <span className="toolbar__stats" title="Resumen del modelo UML actual">
          <BarChart3 size={13} /> {stats.classes} {stats.classes === 1 ? 'clase' : 'clases'} · {stats.relations} rel
        </span>

        {lastSavedAt && (
          <span className="toolbar__autosave" title={`Último guardado: ${lastSavedAt.toLocaleTimeString()}`}>
            <CheckCircle2 size={13} /> Guardado {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        {/* Actions group: undo/redo, create, organized menus, save */}
        <div className="toolbar__group">
          <button
            className="toolbar__btn"
            onClick={undo}
            disabled={past.length === 0}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="toolbar__btn"
            onClick={redo}
            disabled={future.length === 0}
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>

          <span className="toolbar__divider" />

          <button className="toolbar__btn toolbar__btn--hero" data-tour="add-class" onClick={addClass}>
            <Plus size={15} /> Clase
          </button>
          <button className="toolbar__btn" onClick={addNote} title="Añadir nota adhesiva">
            <StickyNote size={15} /> Nota
          </button>

          <input
            ref={xmiInputRef}
            type="file"
            accept=".xmi,.xml,application/xml,text/xml"
            style={{ display: 'none' }}
            onChange={(e) => void handleXmiSelected(e)}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => void handlePhotoSelected(e)}
          />

          {/* Menú 1: Archivo */}
          <ToolbarMenu
            icon={<FolderOpen size={15} />}
            label="Archivo"
            items={[
              {
                key: 'my-diagrams',
                icon: <FolderOpen size={15} />,
                label: 'Mis diagramas',
                onClick: () => setShowDiagramsList(true),
              },
              {
                key: 'templates',
                icon: <LayoutTemplate size={15} />,
                label: 'Cargar plantilla…',
                onClick: () => setShowTemplates(true),
              },
              {
                key: 'photo',
                icon: <Camera size={15} />,
                label: analyzingPhoto ? 'Analizando foto…' : 'Foto de pizarra (IA)',
                disabled: analyzingPhoto,
                onClick: () => photoInputRef.current?.click(),
              },
              {
                key: 'import-xmi',
                icon: <Upload size={15} />,
                label: importingXmi ? 'Importando…' : 'Importar XMI',
                disabled: importingXmi,
                title: 'Importar diagrama desde un archivo XMI',
                onClick: () => xmiInputRef.current?.click(),
              },
              {
                key: 'export-png',
                icon: <ImageIcon size={15} />,
                label: exportingImage ? 'Exportando…' : 'Exportar como PNG',
                disabled: exportingImage || nodes.length === 0,
                onClick: () => void handleExportImage('png'),
              },
              {
                key: 'export-svg',
                icon: <ImageIcon size={15} />,
                label: exportingImage ? 'Exportando…' : 'Exportar como SVG',
                disabled: exportingImage || nodes.length === 0,
                onClick: () => void handleExportImage('svg'),
              },
              {
                key: 'export-postman',
                icon: <Send size={15} />,
                label: 'Exportar colección Postman',
                disabled: nodes.length === 0,
                onClick: () => exportPostmanCollection(buildModel(), diagramName),
              },
              {
                key: 'export-sql',
                icon: <Database size={15} />,
                label: 'Exportar script SQL DDL',
                disabled: nodes.length === 0,
                onClick: () => exportSqlSchema(buildModel(), diagramName),
              },
              {
                key: 'export-xmi',
                icon: <Download size={15} />,
                label: exportingXmi ? 'Exportando…' : 'Exportar XMI estándar',
                disabled: exportingXmi,
                onClick: () => void exportXmi(),
              },
              {
                key: 'history',
                icon: <History size={15} />,
                label: 'Bitácora de cambios',
                disabled: !diagramId,
                onClick: () => setShowHistory(true),
              },
              {
                key: 'attachments',
                icon: <Paperclip size={15} />,
                label: 'Documentos adjuntos',
                disabled: !diagramId,
                onClick: () => setShowAttachments(true),
              },
              {
                key: 'documentation',
                icon: <FileText size={15} />,
                label: generatingDocs ? 'Generando…' : 'Documentación Markdown',
                disabled: generatingDocs,
                onClick: () => void openDocs(),
              },
            ]}
          />

          {/* Menú 2: Diseño & Calidad */}
          <ToolbarMenu
            icon={<Layers size={15} />}
            label="Diseño & Calidad"
            items={[
              {
                key: 'metrics',
                icon: <Gauge size={15} />,
                label: 'Métricas OO (SOLID / CBO / DIT)',
                disabled: nodes.length === 0,
                onClick: () => setShowMetrics(true),
              },
              {
                key: 'diff',
                icon: <GitCompare size={15} />,
                label: 'Comparar versiones (Diagram Diff)',
                disabled: nodes.length === 0,
                onClick: () => setShowDiff(true),
              },
              {
                key: 'layout',
                icon: <Workflow size={15} />,
                label: 'Reorganizar lienzo (Auto-Layout)',
                disabled: nodes.length === 0,
                onClick: autoLayout,
              },
              {
                key: 'view-mode',
                icon: <Layers size={15} />,
                label: viewMode === 'uml' ? 'Cambiar a modo DER' : 'Cambiar a modo UML',
                onClick: () => setViewMode((m) => (m === 'uml' ? 'der' : 'uml')),
              },
              {
                key: 'grid',
                icon: <Grid3x3 size={15} />,
                label: snapToGrid ? 'Desactivar cuadrícula' : 'Ajustar a cuadrícula',
                onClick: () => setSnapToGrid((v) => !v),
              },
            ]}
          />

          {/* Menú 3: Código & Generación */}
          <ToolbarMenu
            icon={<Code2 size={15} />}
            label="Código"
            items={[
              {
                key: 'preview-java',
                icon: <Code2 size={15} />,
                label: loadingPreview ? 'Generando…' : 'Ver código Java Spring Boot',
                disabled: loadingPreview || nodes.length === 0,
                onClick: () => void handleOpenCodePreview(editingClass?.name),
              },
              {
                key: 'sequence',
                icon: <GitCommitHorizontal size={15} />,
                label: 'Diagrama de secuencia UML',
                disabled: nodes.length === 0,
                onClick: () => {
                  setSequenceTargetClass(editingClass?.name);
                  setShowSequence(true);
                },
              },
              {
                key: 'stories',
                icon: <BookOpenCheck size={15} />,
                label: 'Historias de usuario Scrum & Gherkin',
                disabled: nodes.length === 0,
                onClick: () => setShowStories(true),
              },
            ]}
          />

          <button className="toolbar__btn" onClick={() => void saveDiagram()} disabled={saving}>
            <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
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

        {/* Botones de acción primaria (Hero Buttons) */}
        <div className="toolbar__group">
          <button
            className="toolbar__btn toolbar__btn--accent"
            title="Simular y ejecutar endpoints REST en vivo en el navegador (Mock API Runner)"
            onClick={() => {
              setMockApiTargetClass(editingClass?.name);
              setShowMockApi(true);
            }}
            disabled={nodes.length === 0}
          >
            <Terminal size={15} /> Runner API
          </button>
          <button
            className="toolbar__btn"
            data-tour="generate-backend"
            onClick={() => void generateBackend()}
            disabled={generating}
            title="Generar y descargar el código fuente Spring Boot en ZIP"
          >
            <Server size={15} /> {generating ? 'Generando…' : 'Spring Boot'}
          </button>
          <button
            className="toolbar__btn"
            data-tour="validate"
            onClick={() => void validateCurrentDiagram()}
            disabled={validating}
          >
            <ShieldCheck size={15} /> {validating ? 'Validando…' : 'Validar'}
          </button>
          <button
            className="toolbar__btn"
            onClick={() => setShowCommandPalette(true)}
            title="Abrir paleta rápida de comandos (Ctrl + K)"
          >
            <Search size={15} /> Comandos
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

        <button
          className="toolbar__btn toolbar__help"
          onClick={() => setShowShortcuts(true)}
          title="Ver atajos de teclado (?)"
        >
          <Keyboard size={15} /> Atajos (?)
        </button>
        <button className="toolbar__btn toolbar__help" onClick={() => setShowTour(true)}>
          <HelpCircle size={15} /> Recorrido
        </button>

        <div className="toolbar__user-group">
          <button
            type="button"
            className="toolbar__user-pill"
            onClick={() => setShowProfile(true)}
            title="Mi Perfil: ver y modificar datos personales"
          >
            <span className="toolbar__user-avatar">
              {user?.name?.charAt(0).toUpperCase() || <UserIcon size={12} />}
            </span>
            <span className="toolbar__user-name">{user?.name}</span>
          </button>
          <button
            type="button"
            className="toolbar__btn toolbar__logout-btn"
            onClick={() => {
              logout();
              toast.info('Sesión cerrada correctamente');
            }}
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
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
            nodes={nodes.map((n) => {
              if (n.type === 'umlNote') {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    onChangeText: (text: string) => updateNoteText(n.id, text),
                    onDelete: () => deleteNote(n.id),
                  },
                };
              }
              return {
                ...n,
                data: {
                  ...n.data,
                  viewMode,
                  lockedBy: myLocksRef.current.has(n.id) ? undefined : locks[n.id],
                  hasError: errorClassIds.has(n.id),
                },
              };
            })}
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
            onSelectionChange={({ nodes: selected }) => {
              const ids = selected.map((n) => n.id);
              setSelectedNodeIds((prev) =>
                prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids,
              );
            }}
            onPaneContextMenu={handlePaneContextMenu}
            onNodeContextMenu={handleNodeContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            snapToGrid={snapToGrid}
            snapGrid={[20, 20]}
            fitView
          >
            <UmlMarkerDefs />
            <Background gap={20} />
            <Controls />
            <MiniMap
              style={{ backgroundColor: '#1e1e1e' }}
              maskColor="rgba(0, 0, 0, 0.6)"
              nodeColor="#4a5568"
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <CanvasEmptyState
              onAddClass={addClass}
              onOpenTemplates={() => setShowTemplates(true)}
              onScanPhoto={() => photoInputRef.current?.click()}
              onOpenShortcuts={() => setShowShortcuts(true)}
            />
          )}

          {contextMenu && (
            <ContextMenu
              data={contextMenu}
              onClose={() => setContextMenu(null)}
              onAddClassAt={addClassAt}
              onAddNoteAt={addNoteAt}
              onAutoLayout={autoLayout}
              onOpenRunnerApi={(clsName) => {
                if (clsName) setMockApiTargetClass(clsName);
                setShowMockApi(true);
              }}
              onEditClass={handleEditClass}
              onPreviewCode={(clsName) => void handleOpenCodePreview(clsName)}
              onOpenSequence={(clsName) => {
                setSequenceTargetClass(clsName);
                setShowSequence(true);
              }}
              onOpenStories={() => setShowStories(true)}
              onDuplicateClass={duplicateClass}
              onDeleteClass={deleteClass}
            />
          )}

          <UmlLegend />

          {selectedNodeIds.length > 1 && (
            <div className="multi-select-bar">
              <span>{selectedNodeIds.length} clases seleccionadas</span>
              <button onClick={() => void deleteSelectedClasses()} title="Eliminar clases seleccionadas (Supr)">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}

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
            onDuplicate={() => duplicateClass(editingClass.id)}
            onPreviewCode={() => void handleOpenCodePreview(editingClass.name)}
            onOpenSequence={() => {
              setSequenceTargetClass(editingClass.name);
              setShowSequence(true);
            }}
            onOpenMockApi={() => {
              setMockApiTargetClass(editingClass.name);
              setShowMockApi(true);
            }}
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

      <StatusBar
        model={buildModel()}
        connected={connected}
        activeUsersCount={collaboratorCount}
        lastSavedAt={lastSavedAt}
        viewMode={viewMode}
        onOpenMetrics={() => setShowMetrics(true)}
        onOpenRunnerApi={() => setShowMockApi(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />

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
      {showHistory && diagramId && (
        <HistoryPanel diagramId={diagramId} onClose={() => setShowHistory(false)} />
      )}
      {showAttachments && diagramId && (
        <AttachmentsPanel diagramId={diagramId} onClose={() => setShowAttachments(false)} />
      )}
      {codePreview && (
        <CodePreviewModal
          previewData={codePreview}
          initialClassName={editingClass?.name}
          onClose={() => setCodePreview(null)}
        />
      )}
      {showCommandPalette && (
        <CommandPaletteModal
          nodes={nodes}
          onClose={() => setShowCommandPalette(false)}
          onFocusClass={focusClass}
          onAddClass={addClass}
          onAddNote={addNote}
          onSaveDiagram={() => void saveDiagram()}
          onValidate={() => void validateCurrentDiagram()}
          onOpenMetrics={() => setShowMetrics(true)}
          onOpenSequence={() => {
            setSequenceTargetClass(editingClass?.name);
            setShowSequence(true);
          }}
          onOpenStories={() => setShowStories(true)}
          onOpenDiff={() => setShowDiff(true)}
          onOpenRunnerApi={() => {
            setMockApiTargetClass(editingClass?.name);
            setShowMockApi(true);
          }}
          onPreviewJava={() => void handleOpenCodePreview(editingClass?.name)}
          onGenerateBackend={() => void generateBackend()}
          onAutoLayout={autoLayout}
          onExportPng={() => void handleExportImage('png')}
          onExportSql={() => exportSqlSchema(buildModel(), diagramName)}
          onExportPostman={() => exportPostmanCollection(buildModel(), diagramName)}
          onExportXmi={() => void exportXmi()}
          onOpenProfile={() => setShowProfile(true)}
          onLogout={() => {
            logout();
            toast.info('Sesión cerrada correctamente');
          }}
        />
      )}
      {showSpotlight && (
        <SpotlightSearchModal
          nodes={nodes}
          onSelect={focusClass}
          onClose={() => setShowSpotlight(false)}
        />
      )}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
      {showMetrics && (
        <MetricsModal
          model={buildModel()}
          onClose={() => setShowMetrics(false)}
        />
      )}
      {showSequence && (
        <SequenceDiagramModal
          model={buildModel()}
          initialClassName={sequenceTargetClass}
          onClose={() => setShowSequence(false)}
        />
      )}
      {showStories && (
        <UserStoriesModal
          model={buildModel()}
          diagramName={diagramName}
          onClose={() => setShowStories(false)}
        />
      )}
      {showDiff && (
        <DiffModal
          currentModel={buildModel()}
          initialSessionModel={initialModelFromPast}
          onClose={() => setShowDiff(false)}
        />
      )}
      {showMockApi && (
        <MockApiModal
          model={buildModel()}
          initialClassName={mockApiTargetClass}
          onClose={() => setShowMockApi(false)}
        />
      )}
      {showProfile && (
        <ProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ToastProvider>
      <ReactFlowProvider>
        <AppInner />
      </ReactFlowProvider>
    </ToastProvider>
  );
}
