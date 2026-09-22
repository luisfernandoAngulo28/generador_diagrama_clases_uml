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
  /** Whether this class has validation issues / errors */
  hasError?: boolean;
  /** Presentation mode: object-oriented UML or physical relational DER */
  viewMode?: 'uml' | 'der';
}

function toSqlType(attrName: string, umlType: string): string {
  const t = umlType.trim().toLowerCase();
  const lower = attrName.toLowerCase();
  if (lower.includes('descrip') || lower.includes('nota') || lower.includes('detalle')) return 'TEXT';
  if (t === 'string' || t === 'text') return 'VARCHAR(255)';
  if (t === 'int' || t === 'integer') return 'INTEGER';
  if (t === 'long') return 'BIGINT';
  if (t === 'double' || t === 'float') return 'DOUBLE';
  if (t === 'bigdecimal' || t === 'decimal') return 'NUMERIC(12,2)';
  if (t === 'boolean' || t === 'bool') return 'BOOLEAN';
  if (t === 'date' || t === 'localdate') return 'DATE';
  if (t === 'datetime' || t === 'localdatetime' || t === 'timestamp') return 'TIMESTAMP';
  return 'VARCHAR(100)';
}

function UmlClassNodeImpl({ data, selected }: NodeProps) {
  const { umlClass, onEdit, lockedBy, hasError, viewMode } = data as unknown as UmlClassNodeData;
  const isDer = viewMode === 'der';
  const tableName = umlClass.name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

  return (
    <div
      className={`uml-class-node${selected ? ' uml-class-node--selected' : ''}${
        lockedBy ? ' uml-class-node--locked' : ''
      }${hasError ? ' uml-class-node--has-error' : ''}${isDer ? ' uml-class-node--der' : ''}`}
      onDoubleClick={() => onEdit(umlClass.id)}
      title={
        lockedBy
          ? `${lockedBy} está editando esta clase`
          : hasError
          ? 'Esta clase contiene observaciones o errores de validación'
          : undefined
      }
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {lockedBy && (
        <div className="uml-class-node__lock">
          <Lock size={11} /> {lockedBy}
        </div>
      )}
      <div className={`uml-class-node__header ${isDer ? 'uml-class-node__header--der' : ''}`}>
        {isDer ? (
          <div className="uml-class-node__der-badge">TABLA RELACIONAL</div>
        ) : (
          umlClass.stereotype && (
            <div className="uml-class-node__stereotype">«{umlClass.stereotype}»</div>
          )
        )}
        <span
          className={
            !isDer && umlClass.stereotype === 'abstract'
              ? 'uml-class-node__name--abstract'
              : undefined
          }
        >
          {isDer ? tableName : umlClass.name}
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
                  {isDer ? (
                    <>
                      <span
                        className={
                          attr.isPrimaryKey
                            ? 'uml-class-node__pk-badge'
                            : 'uml-class-node__col-dot'
                        }
                      >
                        {attr.isPrimaryKey ? 'PK' : '•'}
                      </span>
                      <span className="uml-class-node__attr-name">
                        {attr.name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}
                      </span>
                      <span className="uml-class-node__attr-type">
                        : {attr.isPrimaryKey ? 'BIGSERIAL' : toSqlType(attr.name, attr.type)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="uml-class-node__visibility">
                        {VISIBILITY_SYMBOLS[attr.visibility]}
                      </span>
                      <span className="uml-class-node__attr-name">
                        {attr.name}
                        {attr.isPrimaryKey ? ' (PK)' : ''}
                      </span>
                      <span className="uml-class-node__attr-type">: {attr.type}</span>
                    </>
                  )}
                </div>
              ))}
        </div>
      )}
      {!isDer && umlClass.stereotype !== 'enum' && !!umlClass.operations?.length && (
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
