import { Code2, Copy2, Trash2, X } from 'lucide-react';
import type { ClassStereotype, UmlClass } from '../types/uml';

const STEREOTYPE_OPTIONS: { value: ClassStereotype | ''; label: string; hint: string }[] = [
  { value: '', label: 'Ninguno', hint: '' },
  { value: 'enum', label: '«enum»', hint: 'genera un enum de Java en vez de una entidad' },
  { value: 'abstract', label: '«abstract»', hint: 'genera una clase abstracta (usar con Herencia)' },
  { value: 'interface', label: '«interface»', hint: 'genera una interfaz de Java a partir de las operaciones' },
];

interface ClassInspectorProps {
  umlClass: UmlClass;
  onChange: (updated: UmlClass) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreviewCode?: () => void;
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
  onDuplicate,
  onPreviewCode,
}: ClassInspectorProps) {
  const currentStereotype = STEREOTYPE_OPTIONS.find((o) => o.value === (umlClass.stereotype ?? ''));

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

      <label className="inspector__field">
        Estereotipo
        <select
          className="inspector__cell-input"
          value={umlClass.stereotype ?? ''}
          onChange={(e) =>
            onChange({
              ...umlClass,
              stereotype: (e.target.value || undefined) as ClassStereotype | undefined,
            })
          }
        >
          {STEREOTYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {currentStereotype?.hint && (
          <span className="inspector__field-hint">{currentStereotype.hint}</span>
        )}
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

      <div className="inspector__actions">
        {onPreviewCode && (
          <button
            className="inspector__preview"
            onClick={onPreviewCode}
            title="Ver el código Java generado para esta clase"
          >
            <Code2 size={13} /> Ver Java
          </button>
        )}
        <button className="inspector__duplicate" onClick={onDuplicate} title="Clonar esta clase con todos sus atributos">
          <Copy2 size={13} /> Duplicar
        </button>
        <button className="inspector__delete" onClick={onDelete} title="Eliminar clase">
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </aside>
  );
}
