import { useState, useEffect, useMemo } from 'react';
import {
  X,
  GitCompare,
  PlusCircle,
  AlertCircle,
  MinusCircle,
  ArrowRight,
  Filter,
  CheckCircle2,
  Plus,
  Minus,
  Edit3,
  Trash2,
} from 'lucide-react';
import type { UmlModel, Diagram } from '../types/uml';
import { computeDetailedModelDiff, type ClassDiff } from '../lib/modelDiff';
import { listDiagrams, getDiagram } from '../api/client';

interface DiffModalProps {
  currentModel: UmlModel;
  initialSessionModel?: UmlModel;
  onClose: () => void;
}

export function DiffModal({ currentModel, initialSessionModel, onClose }: DiffModalProps) {
  const [targetType, setTargetType] = useState<'initial' | 'saved'>('initial');
  const [savedDiagrams, setSavedDiagrams] = useState<Diagram[]>([]);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>('');
  const [comparedModel, setComparedModel] = useState<UmlModel | null>(initialSessionModel ?? null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'added' | 'modified' | 'removed'>('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDiagrams()
      .then((diagrams) => {
        setSavedDiagrams(diagrams);
        if (!initialSessionModel && diagrams.length > 0) {
          setTargetType('saved');
          setSelectedDiagramId(diagrams[0].id);
        }
      })
      .catch(() => {});
  }, [initialSessionModel]);

  // When selected diagram changes, fetch its full model
  useEffect(() => {
    if (targetType === 'initial') {
      setComparedModel(initialSessionModel ?? null);
      return;
    }

    if (selectedDiagramId) {
      setLoading(true);
      getDiagram(selectedDiagramId)
        .then((d) => setComparedModel(d.model))
        .catch(() => setComparedModel(null))
        .finally(() => setLoading(false));
    }
  }, [targetType, selectedDiagramId, initialSessionModel]);

  const diffResult = useMemo(() => {
    if (!comparedModel) {
      return computeDetailedModelDiff({ classes: [], relations: [] }, currentModel);
    }
    return computeDetailedModelDiff(comparedModel, currentModel);
  }, [comparedModel, currentModel]);

  const filteredClasses = useMemo(() => {
    if (filterStatus === 'ALL') {
      return diffResult.classes.filter((c) => c.status !== 'unchanged');
    }
    return diffResult.classes.filter((c) => c.status === filterStatus);
  }, [diffResult, filterStatus]);

  const hasChanges =
    diffResult.summary.addedClasses > 0 ||
    diffResult.summary.modifiedClasses > 0 ||
    diffResult.summary.removedClasses > 0 ||
    diffResult.summary.addedRelations > 0 ||
    diffResult.summary.removedRelations > 0;

  return (
    <div className="diff-backdrop" onClick={onClose}>
      <div className="diff-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <header className="diff-modal__header">
          <div className="diff-modal__title-group">
            <GitCompare size={22} className="diff-modal__icon" />
            <div>
              <h3>Comparador Visual de Versiones (Diagram Diff)</h3>
              <p>Detecta cambios estructurales, adición y remoción de clases, atributos y relaciones UML</p>
            </div>
          </div>
          <button className="diff-modal__close" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </header>

        {/* Toolbar de selección de versión */}
        <div className="diff-toolbar">
          <div className="diff-toolbar__target">
            <label>Comparar Diagrama Actual vs:</label>
            <select
              value={targetType === 'initial' ? 'initial' : selectedDiagramId}
              onChange={(e) => {
                if (e.target.value === 'initial') {
                  setTargetType('initial');
                } else {
                  setTargetType('saved');
                  setSelectedDiagramId(e.target.value);
                }
              }}
              className="diff-select"
            >
              {initialSessionModel && (
                <option value="initial">Estado Inicial de la Sesión</option>
              )}
              {savedDiagrams.map((d) => (
                <option key={d.id} value={d.id}>
                  Diagrama Guardado: {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="diff-summary-pills">
            <span className="diff-pill diff-pill--added">
              <Plus size={12} /> {diffResult.summary.addedClasses} nuevas
            </span>
            <span className="diff-pill diff-pill--modified">
              <Edit3 size={12} /> {diffResult.summary.modifiedClasses} modificadas
            </span>
            <span className="diff-pill diff-pill--removed">
              <Minus size={12} /> {diffResult.summary.removedClasses} eliminadas
            </span>
            <span className="diff-pill diff-pill--rel">
              {diffResult.summary.addedRelations > 0
                ? `+${diffResult.summary.addedRelations} rel`
                : `${diffResult.relations.length} rel`}
            </span>
          </div>

          <div className="diff-filter">
            <Filter size={14} />
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'ALL' | 'added' | 'modified' | 'removed')
              }
              className="diff-select"
            >
              <option value="ALL">Ver todos los cambios</option>
              <option value="added">Solo Nuevas</option>
              <option value="modified">Solo Modificadas</option>
              <option value="removed">Solo Eliminadas</option>
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="diff-modal__body">
          {loading ? (
            <p className="diff-empty">Cargando modelo a comparar…</p>
          ) : !hasChanges ? (
            <div className="diff-empty diff-empty--clean">
              <CheckCircle2 size={32} />
              <p>No se detectaron diferencias. Ambos diagramas son idénticos.</p>
            </div>
          ) : (
            <div className="diff-content">
              {/* Grid de Clases con Cambios */}
              <div className="diff-classes-grid">
                {filteredClasses.map((cls: ClassDiff) => (
                  <div key={cls.classId} className={`diff-card diff-card--${cls.status}`}>
                    <div className="diff-card__header">
                      <div className="diff-card__title">
                        {cls.status === 'added' && (
                          <PlusCircle size={16} className="diff-icon diff-icon--added" />
                        )}
                        {cls.status === 'modified' && (
                          <AlertCircle size={16} className="diff-icon diff-icon--modified" />
                        )}
                        {cls.status === 'removed' && (
                          <MinusCircle size={16} className="diff-icon diff-icon--removed" />
                        )}
                        <strong>{cls.name}</strong>
                      </div>
                      <span className={`diff-tag diff-tag--${cls.status}`}>
                        {cls.status === 'added' ? (
                          <>
                            <Plus size={11} /> NUEVA
                          </>
                        ) : cls.status === 'modified' ? (
                          <>
                            <Edit3 size={11} /> MODIFICADA
                          </>
                        ) : (
                          <>
                            <Trash2 size={11} /> ELIMINADA
                          </>
                        )}
                      </span>
                    </div>

                    {cls.oldName && (
                      <div className="diff-card__row">
                        <span className="diff-label">Nombre anterior:</span>
                        <code className="diff-code diff-code--old">{cls.oldName}</code>
                      </div>
                    )}

                    {cls.changesDescription && (
                      <p className="diff-card__desc">{cls.changesDescription}</p>
                    )}

                    {cls.addedAttributes.length > 0 && (
                      <div className="diff-card__attrs">
                        <span className="diff-attrs-title diff-attrs-title--added">
                          Atributos Agregados:
                        </span>
                        <ul>
                          {cls.addedAttributes.map((attr, i) => (
                            <li key={i} className="diff-attr diff-attr--added">
                              <Plus size={11} /> {attr}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {cls.removedAttributes.length > 0 && (
                      <div className="diff-card__attrs">
                        <span className="diff-attrs-title diff-attrs-title--removed">
                          Atributos Eliminados:
                        </span>
                        <ul>
                          {cls.removedAttributes.map((attr, i) => (
                            <li key={i} className="diff-attr diff-attr--removed">
                              <Minus size={11} /> {attr}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Relaciones modificadas */}
              {diffResult.relations.some((r) => r.status !== 'unchanged') && (
                <div className="diff-relations-box">
                  <h4>Cambios en Relaciones</h4>
                  <ul className="diff-relations-list">
                    {diffResult.relations
                      .filter((r) => r.status !== 'unchanged')
                      .map((rel) => (
                        <li key={rel.id} className={`diff-rel-item diff-rel-item--${rel.status}`}>
                          <span className="diff-rel-status">
                            {rel.status === 'added' ? <Plus size={12} /> : <Minus size={12} />}
                          </span>
                          <span className="diff-rel-source">{rel.sourceName}</span>
                          <span className="diff-rel-type">──({rel.type})──</span>
                          <ArrowRight size={12} />
                          <span className="diff-rel-target">{rel.targetName}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="diff-modal__footer">
          <button className="diff-modal__btn-close" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
