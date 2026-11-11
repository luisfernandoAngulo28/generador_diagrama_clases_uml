import { ArrowRight, Trash2, X } from 'lucide-react';
import type { Navigability, RelationType } from '../types/uml';
import { RELATION_LABELS } from '../types/uml';
import {
  MULTIPLICITY_RELATION_TYPES,
  formatMultiplicity,
  isValidMultiplicity,
  sourceMultiplicity,
  targetMultiplicity,
} from '../lib/multiplicity';
import { useState } from 'react';

export interface RelationEditState {
  id: string;
  type: RelationType;
  sourceClassName: string;
  targetClassName: string;
  sourceRole: string;
  targetRole: string;
  sourceMultiplicity: string;
  targetMultiplicity: string;
  navigability: Navigability | '';
  associationClassId: string;
  sourceClassId: string;
  targetClassId: string;
}

export type RelationPatch = Partial<
  Pick<
    RelationEditState,
    'type' | 'sourceRole' | 'targetRole' | 'sourceMultiplicity' | 'targetMultiplicity' | 'navigability' | 'associationClassId'
  >
>;

interface RelationInspectorProps {
  relation: RelationEditState;
  /** Classes of the diagram, to pick an association class. */
  classes: { id: string; name: string }[];
  onChange: (patch: RelationPatch) => void;
  onClose: () => void;
  onDelete: () => void;
}

const RELATION_TYPES = Object.keys(RELATION_LABELS) as RelationType[];

/** Multiplicity input: only accepts a valid UML multiplicity; empty = automatic. */
function MultiplicityInput({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setDraft(value);
  }
  const trimmed = draft.trim();
  const valid = trimmed === '' || isValidMultiplicity(trimmed);
  return (
    <input
      className={`inspector__cell-input${valid ? '' : ' inspector__cell-input--invalid'}`}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const t = e.target.value.trim();
        if (t === '' || isValidMultiplicity(t)) onCommit(t);
      }}
      title={valid ? 'Multiplicidad UML: 1, 0..1, 2..5, 1..*, *' : 'No es una multiplicidad UML válida (ej: 0..1, 2..5, 1..*)'}
    />
  );
}

export function RelationInspector({
  relation,
  classes,
  onChange,
  onClose,
  onDelete,
}: RelationInspectorProps) {
  return (
    <aside className="inspector inspector--relation">
      <div className="inspector__header">
        <span className="inspector__class-name">
          {relation.sourceClassName} <ArrowRight size={14} /> {relation.targetClassName}
        </span>
        <button className="inspector__close" onClick={onClose}>
          <X size={16} />
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

      {MULTIPLICITY_RELATION_TYPES.has(relation.type) && (
        <>
          <div className="inspector__row">
            <label className="inspector__field">
              Multiplicidad en {relation.sourceClassName}
              <MultiplicityInput
                value={relation.sourceMultiplicity}
                placeholder={formatMultiplicity(sourceMultiplicity(relation.type))}
                onCommit={(v) => onChange({ sourceMultiplicity: v })}
              />
            </label>
            <label className="inspector__field">
              Multiplicidad en {relation.targetClassName}
              <MultiplicityInput
                value={relation.targetMultiplicity}
                placeholder={formatMultiplicity(targetMultiplicity(relation.type))}
                onCommit={(v) => onChange({ targetMultiplicity: v })}
              />
            </label>
          </div>
          <p className="inspector__hint">
            Vacío = automática según el tipo. Se puede escribir cualquier multiplicidad UML: 1, 0..1,
            2..5, 1..*
          </p>

          <label className="inspector__field">
            Navegabilidad
            <select
              className="inspector__cell-input"
              value={relation.navigability}
              onChange={(e) => onChange({ navigability: e.target.value as Navigability | '' })}
            >
              <option value="">Sin especificar</option>
              <option value="SOURCE_TO_TARGET">
                {relation.sourceClassName} → {relation.targetClassName}
              </option>
              <option value="TARGET_TO_SOURCE">
                {relation.targetClassName} → {relation.sourceClassName}
              </option>
            </select>
          </label>

          <label className="inspector__field">
            Clase de asociación
            <select
              className="inspector__cell-input"
              value={relation.associationClassId}
              onChange={(e) => onChange({ associationClassId: e.target.value })}
            >
              <option value="">Ninguna</option>
              {classes
                .filter((c) => c.id !== relation.sourceClassId && c.id !== relation.targetClassId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <span className="inspector__field-hint">
              Se une con una línea punteada al centro de la asociación (UML 2.5)
            </span>
          </label>
        </>
      )}

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
        <Trash2 size={14} /> Eliminar relación
      </button>
    </aside>
  );
}
