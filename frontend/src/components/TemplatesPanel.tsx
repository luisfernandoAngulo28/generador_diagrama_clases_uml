import { useState } from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import { DIAGRAM_TEMPLATES, type DiagramTemplate } from '../lib/templates';

interface TemplatesPanelProps {
  onApply: (template: DiagramTemplate) => void;
  onClose: () => void;
}

export function TemplatesPanel({ onApply, onClose }: TemplatesPanelProps) {
  const [selectedId, setSelectedId] = useState(DIAGRAM_TEMPLATES[0].id);
  const selected = DIAGRAM_TEMPLATES.find((t) => t.id === selectedId)!;

  return (
    <div className="template-builder">
      <div className="template-builder__backdrop" onClick={onClose} />
      <div className="template-builder__panel">
        <div className="template-builder__header">
          <span className="panel-title">
            <LayoutTemplate size={16} /> Plantillas
          </span>
          <button className="template-builder__apply" onClick={() => onApply(selected)}>
            Crear diagrama
          </button>
          <button className="template-builder__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="template-builder__body">
          <ul className="template-builder__list">
            {DIAGRAM_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  className={`template-builder__list-item${
                    t.id === selectedId ? ' template-builder__list-item--active' : ''
                  }`}
                  onClick={() => setSelectedId(t.id)}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="template-builder__detail">
            <h3>{selected.name}</h3>
            <p className="template-builder__description">{selected.description}</p>

            <h4>¿Para qué sirve?</h4>
            <p>{selected.purpose}</p>

            <h4>Qué puedes hacer después</h4>
            <ul>
              {selected.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
