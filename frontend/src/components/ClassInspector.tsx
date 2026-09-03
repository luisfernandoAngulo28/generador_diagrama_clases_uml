import { Trash2, X } from 'lucide-react';
import type { UmlClass } from '../types/uml';

interface ClassInspectorProps {
  umlClass: UmlClass;
  onChange: (updated: UmlClass) => void;
  onClose: () => void;
  onDelete: () => void;
}

/**
 * "Properties" panel: general identity of the selected class (name,
 * stereotype, notes). Attributes/Operations live in the bottom-docked
 * FeaturesPanel instead, mirroring Enterprise Architect's Properties +
 * Features split.
 */
export function ClassInspector({
  umlClass,
  onChange,
  onClose,
  onDelete,
}: ClassInspectorProps) {
  const isEnum = umlClass.stereotype === 'enum';

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <input
          className="inspector__class-name"
          value={umlClass.name}
          onChange={(e) => onChange({ ...umlClass, name: e.target.value })}
        />
        <button className="inspector__close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <label className="inspector__stereotype">
        <input
          type="checkbox"
          checked={isEnum}
          onChange={(e) =>
            onChange({
              ...umlClass,
              stereotype: e.target.checked ? 'enum' : undefined,
            })
          }
        />
        «enum» (genera un enum de Java en vez de una entidad)
      </label>

      <label className="inspector__field">
        Notas
        <textarea
          className="inspector__notes"
          rows={6}
          placeholder="Describe el propósito de esta clase (aparece en la documentación generada)…"
          value={umlClass.description ?? ''}
          onChange={(e) => onChange({ ...umlClass, description: e.target.value })}
        />
      </label>

      <button className="inspector__delete" onClick={onDelete}>
        <Trash2 size={14} /> Eliminar clase
      </button>
    </aside>
  );
}
