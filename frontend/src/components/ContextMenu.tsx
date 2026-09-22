import { useEffect, useRef } from 'react';
import {
  Plus,
  StickyNote,
  Workflow,
  Terminal,
  Code2,
  GitCommitHorizontal,
  BookOpenCheck,
  Copy,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import type { UmlClass } from '../types/uml';

export interface CanvasContextMenuData {
  type: 'canvas';
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export interface NodeContextMenuData {
  type: 'node';
  x: number;
  y: number;
  nodeId: string;
  umlClass: UmlClass;
}

export type ContextMenuData = CanvasContextMenuData | NodeContextMenuData;

interface ContextMenuProps {
  data: ContextMenuData;
  onClose: () => void;
  onAddClassAt: (x: number, y: number) => void;
  onAddNoteAt: (x: number, y: number) => void;
  onAutoLayout: () => void;
  onOpenRunnerApi: (className?: string) => void;
  onEditClass: (classId: string) => void;
  onPreviewCode: (className: string) => void;
  onOpenSequence: (className: string) => void;
  onOpenStories: () => void;
  onDuplicateClass: (classId: string) => void;
  onDeleteClass: (classId: string) => void;
}

export function ContextMenu({
  data,
  onClose,
  onAddClassAt,
  onAddNoteAt,
  onAutoLayout,
  onOpenRunnerApi,
  onEditClass,
  onPreviewCode,
  onOpenSequence,
  onOpenStories,
  onDuplicateClass,
  onDeleteClass,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust menu position so it doesn't overflow screen
  const menuStyle: React.CSSProperties = {
    top: Math.min(data.y, window.innerHeight - 300),
    left: Math.min(data.x, window.innerWidth - 240),
  };

  if (data.type === 'canvas') {
    return (
      <div ref={menuRef} className="app-context-menu" style={menuStyle}>
        <div className="app-context-menu__header">Lienzo UML</div>

        <button
          className="app-context-menu__item"
          onClick={() => {
            onAddClassAt(data.canvasX, data.canvasY);
            onClose();
          }}
        >
          <Plus size={15} className="app-context-menu__icon--green" />
          <span>Nueva Clase aquí</span>
        </button>

        <button
          className="app-context-menu__item"
          onClick={() => {
            onAddNoteAt(data.canvasX, data.canvasY);
            onClose();
          }}
        >
          <StickyNote size={15} className="app-context-menu__icon--yellow" />
          <span>Nueva Nota adhesiva</span>
        </button>

        <div className="app-context-menu__divider" />

        <button
          className="app-context-menu__item"
          onClick={() => {
            onAutoLayout();
            onClose();
          }}
        >
          <Workflow size={15} />
          <span>Reorganizar Lienzo (Layout)</span>
        </button>

        <button
          className="app-context-menu__item"
          onClick={() => {
            onOpenRunnerApi();
            onClose();
          }}
        >
          <Terminal size={15} className="app-context-menu__icon--purple" />
          <span>Abrir Runner API REST</span>
        </button>
      </div>
    );
  }

  // Node Context Menu
  const cls = data.umlClass;

  return (
    <div ref={menuRef} className="app-context-menu" style={menuStyle}>
      <div className="app-context-menu__header">
        <span className="app-context-menu__class-tag">Clase:</span> {cls.name}
      </div>

      <button
        className="app-context-menu__item"
        onClick={() => {
          onEditClass(cls.id);
          onClose();
        }}
      >
        <SlidersHorizontal size={15} />
        <span>Editar Propiedades</span>
      </button>

      <button
        className="app-context-menu__item"
        onClick={() => {
          onOpenRunnerApi(cls.name);
          onClose();
        }}
      >
        <Terminal size={15} className="app-context-menu__icon--green" />
        <span>Simular API REST</span>
      </button>

      <button
        className="app-context-menu__item"
        onClick={() => {
          onOpenSequence(cls.name);
          onClose();
        }}
      >
        <GitCommitHorizontal size={15} className="app-context-menu__icon--blue" />
        <span>Diagrama de Secuencia</span>
      </button>

      <button
        className="app-context-menu__item"
        onClick={() => {
          onPreviewCode(cls.name);
          onClose();
        }}
      >
        <Code2 size={15} className="app-context-menu__icon--purple" />
        <span>Ver Código Java Spring</span>
      </button>

      <button
        className="app-context-menu__item"
        onClick={() => {
          onOpenStories();
          onClose();
        }}
      >
        <BookOpenCheck size={15} />
        <span>Historias de Usuario Scrum</span>
      </button>

      <div className="app-context-menu__divider" />

      <button
        className="app-context-menu__item"
        onClick={() => {
          onDuplicateClass(cls.id);
          onClose();
        }}
      >
        <Copy size={15} />
        <span>Duplicar Clase</span>
      </button>

      <button
        className="app-context-menu__item app-context-menu__item--danger"
        onClick={() => {
          onDeleteClass(cls.id);
          onClose();
        }}
      >
        <Trash2 size={15} />
        <span>Eliminar Clase</span>
      </button>
    </div>
  );
}
