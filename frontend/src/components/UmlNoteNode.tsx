import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StickyNote, Trash2 } from 'lucide-react';

export interface UmlNoteNodeData extends Record<string, unknown> {
  text: string;
  onChangeText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

function UmlNoteNodeImpl({ id, data, selected }: NodeProps) {
  const { text, onChangeText, onDelete } = data as unknown as UmlNoteNodeData;

  return (
    <div className={`uml-note-node ${selected ? 'uml-note-node--selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      <div className="uml-note-node__header">
        <span className="uml-note-node__title">
          <StickyNote size={12} /> Nota / Regla UML
        </span>
        <button
          className="uml-note-node__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(id);
          }}
          title="Eliminar nota"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <textarea
        className="uml-note-node__input"
        value={text ?? ''}
        placeholder="Escribe una regla de negocio o comentario…"
        rows={4}
        onChange={(e) => onChangeText?.(id, e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export const UmlNoteNode = memo(UmlNoteNodeImpl);
