import { useMemo } from 'react';
import {
  X,
  Gauge,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import type { UmlModel } from '../types/uml';
import { computeModelMetrics } from '../lib/metrics';

interface MetricsModalProps {
  model: UmlModel;
  onClose: () => void;
}

export function MetricsModal({ model, onClose }: MetricsModalProps) {
  const report = useMemo(() => computeModelMetrics(model), [model]);

  const scoreColor =
    report.overallScore >= 80 ? '#22c55e' : report.overallScore >= 60 ? '#f59e0b' : '#ef4444';

  const scoreBadge =
    report.overallScore >= 80
      ? { label: 'Excelente Calidad', icon: <ShieldCheck size={16} /> }
      : report.overallScore >= 60
      ? { label: 'Aceptable con Advertencias', icon: <AlertTriangle size={16} /> }
      : { label: 'Riesgo de Mantenibilidad', icon: <ShieldAlert size={16} /> };

  return (
    <div className="metrics-backdrop" onClick={onClose}>
      <div className="metrics-modal" onClick={(e) => e.stopPropagation()}>
        <header className="metrics-modal__header">
          <div className="metrics-modal__title-group">
            <div className="metrics-modal__icon-badge">
              <Gauge size={20} />
            </div>
            <div>
              <h3>Métricas de Calidad de Diseño OO</h3>
              <p>Métricas formales de Chidamber & Kemerer (CK) y Principios SOLID</p>
            </div>
          </div>
          <button className="metrics-modal__close" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </header>

        <div className="metrics-modal__body">
          {/* Main Score Hero Card */}
          <div className="metrics-hero">
            <div className="metrics-hero__gauge">
              <div
                className="metrics-hero__circle"
                style={{
                  borderColor: scoreColor,
                  boxShadow: `0 0 25px ${scoreColor}40`,
                }}
              >
                <span className="metrics-hero__number" style={{ color: scoreColor }}>
                  {report.overallScore}
                </span>
                <span className="metrics-hero__denom">/ 100</span>
              </div>
            </div>

            <div className="metrics-hero__details">
              <div
                className="metrics-hero__badge"
                style={{
                  color: scoreColor,
                  borderColor: `${scoreColor}50`,
                  backgroundColor: `${scoreColor}15`,
                }}
              >
                {scoreBadge.icon}
                <span>{scoreBadge.label}</span>
              </div>
              <p className="metrics-hero__desc">
                Este índice evalúa la modularidad, facilidad de mantenimiento y desacoplamiento de
                tu arquitectura de clases para el examen de Ingeniería de Software 1.
              </p>
            </div>
          </div>

          {/* KPI Mini-cards */}
          <div className="metrics-kpis">
            <div className="metrics-kpi">
              <span className="metrics-kpi__label">Clases Analizadas</span>
              <span className="metrics-kpi__value">{report.totalClasses}</span>
              <span className="metrics-kpi__hint">Total en el diagrama</span>
            </div>

            <div className="metrics-kpi">
              <span className="metrics-kpi__label">CBO Promedio</span>
              <span
                className="metrics-kpi__value"
                style={{ color: report.averageCbo <= 3 ? '#22c55e' : '#f59e0b' }}
              >
                {report.averageCbo}
              </span>
              <span className="metrics-kpi__hint">
                {report.averageCbo <= 3 ? 'Bajo acoplamiento (Óptimo)' : 'Acoplamiento moderado'}
              </span>
            </div>

            <div className="metrics-kpi">
              <span className="metrics-kpi__label">Jerarquía Máx (DIT)</span>
              <span
                className="metrics-kpi__value"
                style={{ color: report.maxDit <= 2 ? '#22c55e' : '#ef4444' }}
              >
                {report.maxDit}
              </span>
              <span className="metrics-kpi__hint">
                {report.maxDit <= 2 ? 'Profundidad controlada' : 'Herencia profunda'}
              </span>
            </div>

            <div className="metrics-kpi">
              <span className="metrics-kpi__label">Clases Dios (God Class)</span>
              <span
                className="metrics-kpi__value"
                style={{ color: report.godClassesCount === 0 ? '#22c55e' : '#ef4444' }}
              >
                {report.godClassesCount}
              </span>
              <span className="metrics-kpi__hint">
                {report.godClassesCount === 0 ? 'Sin violaciones SRP' : 'Revisar responsabilidades'}
              </span>
            </div>
          </div>

          {/* Table of per-class metrics */}
          <section className="metrics-section">
            <h4>
              <Activity size={16} /> Desglose Detallado por Clase
            </h4>
            <div className="metrics-table-wrapper">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Clase</th>
                    <th title="Coupling Between Object Classes: número de clases asociadas">CBO (Acoplamiento)</th>
                    <th title="Depth of Inheritance Tree: profundidad en el árbol de herencia">DIT (Herencia)</th>
                    <th title="Number of Children: número de subclases directas">NOC (Subclases)</th>
                    <th>Atributos</th>
                    <th>Métodos</th>
                    <th>Evaluación</th>
                  </tr>
                </thead>
                <tbody>
                  {report.classMetrics.map((item) => (
                    <tr key={item.classId}>
                      <td className="metrics-table__name">
                        <strong>{item.className}</strong>
                        {item.isGodClass && (
                          <span className="metrics-tag metrics-tag--danger">God Class</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`metrics-val ${
                            item.cbo >= 5 ? 'metrics-val--bad' : item.cbo >= 3 ? 'metrics-val--warn' : 'metrics-val--good'
                          }`}
                        >
                          {item.cbo}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`metrics-val ${
                            item.dit >= 3 ? 'metrics-val--bad' : item.dit >= 2 ? 'metrics-val--warn' : 'metrics-val--good'
                          }`}
                        >
                          {item.dit}
                        </span>
                      </td>
                      <td>{item.noc}</td>
                      <td>{item.attributeCount}</td>
                      <td>{item.operationCount}</td>
                      <td>
                        <span className={`metrics-badge-cell metrics-badge-cell--${item.health}`}>
                          {item.health === 'good' ? (
                            <>
                              <CheckCircle2 size={13} /> Saludable ({item.healthScore}%)
                            </>
                          ) : item.health === 'warning' ? (
                            <>
                              <AlertTriangle size={13} /> Atención ({item.healthScore}%)
                            </>
                          ) : (
                            <>
                              <AlertOctagon size={13} /> Refactorizar ({item.healthScore}%)
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recommendations list */}
          <section className="metrics-section">
            <h4>
              <Lightbulb size={16} /> Recomendaciones de Ingeniería de Software (SOLID & GoF)
            </h4>
            <div className="metrics-recommendations">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="metrics-recommendation-card">
                  <div className="metrics-recommendation-card__icon">
                    <Lightbulb size={16} />
                  </div>
                  <p>{rec}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="metrics-modal__footer">
          <button className="metrics-modal__btn-close" onClick={onClose}>
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
}
