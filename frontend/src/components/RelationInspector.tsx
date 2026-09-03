import type { RelationType } from '../types/uml';
import { RELATION_LABELS } from '../types/uml';

export interface RelationEditState {
  id: string;
  type: RelationType;
  sourceClassName: string;
  targetClassName: string;
  sourceRole: string;
  targetRole: string;
}

interface RelationInspectorProps {
  relation: RelationEditState;
  onChange: (patch: Partial<Pick<RelationEditState, 'type' | 'sourceRole' | 'targetRole'>>) => void;
  onClose: () => void;
  onDelete: () => void;
}

const RELATION_TYPES = Object.keys(RELATION_LABELS) as RelationType[];

export function RelationInspector({
  relation,
  onChange,
  onClose,
  onDelete,
}: RelationInspectorProps) {
  return (
    <aside className="inspector inspector--relation">
      <div className="inspector__header">
        <span className="inspector__class-name">
          {relation.sourceClassName} → {relation.targetClassName}
        </span>
        <button className="inspector__close" onClick={onClose}>
          ×
        </button>
      </div>

      <label className="inspector__field">
        Tipo de relación
        <select
          className="inspector__cell-input"
          value={relation.type}
          onChange={(e) => onChange({ type: e.target.value as RelationType })}
        >
          {RELATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {RELATION_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="inspector__field">
        Rol en {relation.sourceClassName} (opcional)
        <input
          className="inspector__cell-input"
          placeholder='ej: "cliente"'
          value={relation.sourceRole}
          onChange={(e) => onChange({ sourceRole: e.target.value })}
        />
      </label>

      <label className="inspector__field">
        Rol en {relation.targetClassName} (opcional)
        <input
          className="inspector__cell-input"
          placeholder='ej: "pedidos"'
          value={relation.targetRole}
          onChange={(e) => onChange({ targetRole: e.target.value })}
        />
      </label>

      <button className="inspector__delete" onClick={onDelete}>
        Eliminar relación
      </button>
    </aside>
  );
}
