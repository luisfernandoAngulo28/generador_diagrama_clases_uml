import type { UmlAttribute, UmlClass, UmlOperation, Visibility } from '../types/uml';

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
  const isEnum = umlClass.stereotype === 'enum';
  const operations = umlClass.operations ?? [];

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
        isEnum
          ? { name: 'NUEVO_VALOR', type: 'String', visibility: 'public' }
          : { name: 'nuevoAtributo', type: 'String', visibility: 'private' },
      ],
    });
  }

  function removeAttribute(index: number) {
    onChange({
      ...umlClass,
      attributes: umlClass.attributes.filter((_, i) => i !== index),
    });
  }

  function updateOperation(index: number, patch: Partial<UmlOperation>) {
    onChange({
      ...umlClass,
      operations: operations.map((op, i) => (i === index ? { ...op, ...patch } : op)),
    });
  }

  function addOperation() {
    onChange({
      ...umlClass,
      operations: [
        ...operations,
        { name: 'nuevaOperacion', returnType: 'void', visibility: 'public', parameters: '' },
      ],
    });
  }

  function removeOperation(index: number) {
    onChange({ ...umlClass, operations: operations.filter((_, i) => i !== index) });
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
          rows={2}
          placeholder="Describe el propósito de esta clase (aparece en la documentación generada)…"
          value={umlClass.description ?? ''}
          onChange={(e) => onChange({ ...umlClass, description: e.target.value })}
        />
      </label>

      <h4 className="inspector__section-title">{isEnum ? 'Valores' : 'Atributos'}</h4>
      <table className="inspector__table">
        <thead>
          <tr>
            <th>Nombre</th>
            {!isEnum && (
              <>
                <th>Tipo</th>
                <th>Visibilidad</th>
                <th>PK</th>
              </>
            )}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {umlClass.attributes.map((attr, index) => (
            <tr key={index}>
              <td>
                <input
                  className="inspector__cell-input"
                  value={attr.name}
                  onChange={(e) => updateAttribute(index, { name: e.target.value })}
                />
              </td>
              {!isEnum && (
                <>
                  <td>
                    <input
                      className="inspector__cell-input"
                      value={attr.type}
                      onChange={(e) => updateAttribute(index, { type: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="inspector__cell-input"
                      value={attr.visibility}
                      onChange={(e) =>
                        updateAttribute(index, { visibility: e.target.value as Visibility })
                      }
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="inspector__cell-center">
                    <input
                      type="checkbox"
                      checked={!!attr.isPrimaryKey}
                      onChange={(e) =>
                        updateAttribute(index, { isPrimaryKey: e.target.checked })
                      }
                    />
                  </td>
                </>
              )}
              <td className="inspector__cell-center">
                <button className="inspector__remove" onClick={() => removeAttribute(index)}>
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="inspector__add" onClick={addAttribute}>
        {isEnum ? '+ Valor' : '+ Atributo'}
      </button>

      {!isEnum && (
        <>
          <h4 className="inspector__section-title">Operaciones</h4>
          <table className="inspector__table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Parámetros</th>
                <th>Retorna</th>
                <th>Visibilidad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className="inspector__cell-input"
                      value={op.name}
                      onChange={(e) => updateOperation(index, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="inspector__cell-input"
                      placeholder="ej: id: Long"
                      value={op.parameters ?? ''}
                      onChange={(e) => updateOperation(index, { parameters: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="inspector__cell-input"
                      value={op.returnType}
                      onChange={(e) => updateOperation(index, { returnType: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="inspector__cell-input"
                      value={op.visibility}
                      onChange={(e) =>
                        updateOperation(index, { visibility: e.target.value as Visibility })
                      }
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="inspector__cell-center">
                    <button className="inspector__remove" onClick={() => removeOperation(index)}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="inspector__add" onClick={addOperation}>
            + Operación
          </button>
        </>
      )}

      <button className="inspector__delete" onClick={onDelete}>
        Eliminar clase
      </button>
    </aside>
  );
}
