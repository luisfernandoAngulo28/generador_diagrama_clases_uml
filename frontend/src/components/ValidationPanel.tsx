import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { ValidationResult } from '../types/uml';

interface ValidationPanelProps {
  result: ValidationResult;
  onClose: () => void;
}

export function ValidationPanel({ result, onClose }: ValidationPanelProps) {
  const totalIssues = result.errors.length + result.warnings.length;

  return (
    <aside className="validation-panel">
      <div className="validation-panel__header">
        <span className="panel-title">
          {result.valid ? (
            <CheckCircle2 size={16} color="#68d391" />
          ) : (
            <AlertTriangle size={16} color="#f6e05e" />
          )}
          Validación lógica
        </span>
        <button className="validation-panel__close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {totalIssues === 0 ? (
        <p className="validation-panel__ok">
          No se detectaron problemas de integridad ni redundancia en el modelo.
        </p>
      ) : (
        <>
          {result.errors.length > 0 && (
            <div className="validation-panel__section">
              <h4 className="validation-panel__section-title validation-panel__section-title--error">
                Errores ({result.errors.length}) — impiden un modelo relacional correcto
              </h4>
              {result.errors.map((issue, i) => (
                <div key={i} className="validation-panel__issue validation-panel__issue--error">
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="validation-panel__section">
              <h4 className="validation-panel__section-title validation-panel__section-title--warning">
                Advertencias ({result.warnings.length}) — normalización y redundancia
              </h4>
              {result.warnings.map((issue, i) => (
                <div key={i} className="validation-panel__issue validation-panel__issue--warning">
                  {issue.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
