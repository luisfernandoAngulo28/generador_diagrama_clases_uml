import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Lock } from 'lucide-react';
import type { UmlClass } from '../types/uml';
import { VISIBILITY_SYMBOLS } from '../types/uml';

export interface UmlClassNodeData extends Record<string, unknown> {
  umlClass: UmlClass;
  onEdit: (classId: string) => void;
  /** Name of the collaborator currently editing this class, if any (not us). */
  lockedBy?: string;
}

function UmlClassNodeImpl({ data, selected }: NodeProps) {
  const { umlClass, onEdit, lockedBy } = data as unknown as UmlClassNodeData;

  return (
    <div
      className={`uml-class-node${selected ? ' uml-class-node--selected' : ''}${
        lockedBy ? ' uml-class-node--locked' : ''
      }`}
      onDoubleClick={() => onEdit(umlClass.id)}
      title={lockedBy ? `${lockedBy} está editando esta clase` : undefined}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {lockedBy && (
        <div className="uml-class-node__lock">
          <Lock size={11} /> {lockedBy}
        </div>
      )}
      <div className="uml-class-node__header">
        {umlClass.stereotype && (
          <div className="uml-class-node__stereotype">«{umlClass.stereotype}»</div>
        )}
        <span className={umlClass.stereotype === 'abstract' ? 'uml-class-node__name--abstract' : undefined}>
          {umlClass.name}
        </span>
      </div>
      {umlClass.stereotype !== 'interface' && (
        <div className="uml-class-node__attributes">
          {umlClass.attributes.length === 0 && (
            <div className="uml-class-node__empty">
              {umlClass.stereotype === 'enum' ? 'sin valores' : 'sin atributos'}
            </div>
          )}
          {umlClass.stereotype === 'enum'
            ? umlClass.attributes.map((attr) => (
                <div key={attr.name} className="uml-class-node__attribute">
                  <span className="uml-class-node__attr-name">{attr.name}</span>
                </div>
              ))
            : umlClass.attributes.map((attr) => (
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
      )}
      {umlClass.stereotype !== 'enum' && !!umlClass.operations?.length && (
        <div className="uml-class-node__operations">
          {umlClass.operations.map((op, i) => (
            <div key={i} className="uml-class-node__attribute">
              <span className="uml-class-node__visibility">
                {VISIBILITY_SYMBOLS[op.visibility]}
              </span>
              <span className="uml-class-node__attr-name">
                {op.name}({op.parameters ?? ''})
              </span>
              <span className="uml-class-node__attr-type">: {op.returnType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const UmlClassNode = memo(UmlClassNodeImpl);
