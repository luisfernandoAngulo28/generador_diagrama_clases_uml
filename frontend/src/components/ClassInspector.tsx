import type { UmlAttribute, UmlClass, Visibility } from '../types/uml';

interface ClassInspectorProps {
  umlClass: UmlClass;
  onChange: (updated: UmlClass) => void;
  onClose: () => void;
  onDelete: () => void;
}

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];

export function ClassInspector({
  umlClass,
  onChange,
  onClose,
  onDelete,
}: ClassInspectorProps) {
  function updateAttribute(index: number, patch: Partial<UmlAttribute>) {
    const attributes = umlClass.attributes.map((a, i) =>
      i === index ? { ...a, ...patch } : a,
    );
    onChange({ ...umlClass, attributes });
  }

  function addAttribute() {
    onChange({
      ...umlClass,
      attributes: [
        ...umlClass.attributes,
        { name: 'nuevoAtributo', type: 'String', visibility: 'private' },
      ],
    });
  }

  function removeAttribute(index: number) {
    onChange({
      ...umlClass,
      attributes: umlClass.attributes.filter((_, i) => i !== index),
    });
  }

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <input
          className="inspector__class-name"
          value={umlClass.name}
          onChange={(e) => onChange({ ...umlClass, name: e.target.value })}
        />
        <button className="inspector__close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="inspector__attributes">
        {umlClass.attributes.map((attr, index) => (
          <div className="inspector__attribute-row" key={index}>
            <input
              className="inspector__input inspector__input--name"
              value={attr.name}
              onChange={(e) => updateAttribute(index, { name: e.target.value })}
            />
            <input
              className="inspector__input inspector__input--type"
              value={attr.type}
              onChange={(e) => updateAttribute(index, { type: e.target.value })}
            />
            <select
              className="inspector__input inspector__input--visibility"
              value={attr.visibility}
              onChange={(e) =>
                updateAttribute(index, {
                  visibility: e.target.value as Visibility,
                })
              }
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <label className="inspector__pk">
              <input
                type="checkbox"
                checked={!!attr.isPrimaryKey}
                onChange={(e) =>
                  updateAttribute(index, { isPrimaryKey: e.target.checked })
                }
              />
              PK
            </label>
            <button
              className="inspector__remove"
              onClick={() => removeAttribute(index)}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <button className="inspector__add" onClick={addAttribute}>
        + Atributo
      </button>

      <button className="inspector__delete" onClick={onDelete}>
        Eliminar clase
      </button>
    </aside>
  );
}
