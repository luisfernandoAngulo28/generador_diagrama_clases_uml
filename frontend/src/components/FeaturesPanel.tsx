import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { UmlAttribute, UmlClass, UmlOperation, Visibility } from '../types/uml';

interface FeaturesPanelProps {
  umlClass: UmlClass;
  onChange: (updated: UmlClass) => void;
}

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];

/**
 * Bottom-docked "Features" grid, mirroring Enterprise Architect's Features
 * panel (Attributes / Operations tabs below the canvas) instead of stacking
 * everything into the right-hand Properties panel.
 */
export function FeaturesPanel({ umlClass, onChange }: FeaturesPanelProps) {
  const isEnum = umlClass.stereotype === 'enum';
  const isInterface = umlClass.stereotype === 'interface';
  const [tab, setTab] = useState<'attributes' | 'operations'>('attributes');
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

  const activeTab = isEnum ? 'attributes' : isInterface ? 'operations' : tab;

  return (
    <div className="features-dock">
      <div className="features-dock__tabs">
        {!isInterface && (
          <button
            className={`features-dock__tab${activeTab === 'attributes' ? ' features-dock__tab--active' : ''}`}
            onClick={() => setTab('attributes')}
          >
            {isEnum ? 'Valores' : 'Atributos'}
          </button>
        )}
        {!isEnum && (
          <button
            className={`features-dock__tab${activeTab === 'operations' ? ' features-dock__tab--active' : ''}`}
            onClick={() => setTab('operations')}
          >
            Operaciones
          </button>
        )}
      </div>

      <div className="features-dock__body">
        {activeTab === 'attributes' ? (
          <>
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
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="inspector__add" onClick={addAttribute}>
              {isEnum ? '+ Valor' : '+ Atributo'}
            </button>
          </>
        ) : (
          <>
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
                        <Trash2 size={14} />
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
      </div>
    </div>
  );
}
