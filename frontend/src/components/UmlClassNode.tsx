import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { UmlClass } from '../types/uml';
import { VISIBILITY_SYMBOLS } from '../types/uml';

export interface UmlClassNodeData extends Record<string, unknown> {
  umlClass: UmlClass;
  onEdit: (classId: string) => void;
}

function UmlClassNodeImpl({ data, selected }: NodeProps) {
  const { umlClass, onEdit } = data as unknown as UmlClassNodeData;

  return (
    <div
      className={`uml-class-node${selected ? ' uml-class-node--selected' : ''}`}
      onDoubleClick={() => onEdit(umlClass.id)}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div className="uml-class-node__header">{umlClass.name}</div>
      <div className="uml-class-node__attributes">
        {umlClass.attributes.length === 0 && (
          <div className="uml-class-node__empty">sin atributos</div>
        )}
        {umlClass.attributes.map((attr) => (
          <div key={attr.name} className="uml-class-node__attribute">
            <span className="uml-class-node__visibility">
              {VISIBILITY_SYMBOLS[attr.visibility]}
            </span>
            <span className="uml-class-node__attr-name">
              {attr.name}
              {attr.isPrimaryKey ? ' (PK)' : ''}
            </span>
            <span className="uml-class-node__attr-type">: {attr.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const UmlClassNode = memo(UmlClassNodeImpl);
