import { DIAGRAM_TEMPLATES, type DiagramTemplate } from '../lib/templates';

interface TemplatesPanelProps {
  onApply: (template: DiagramTemplate) => void;
  onClose: () => void;
}

export function TemplatesPanel({ onApply, onClose }: TemplatesPanelProps) {
  return (
    <div className="diagrams-list">
      <div className="diagrams-list__backdrop" onClick={onClose} />
      <div className="diagrams-list__panel">
        <div className="diagrams-list__header">
          <span>🧩 Plantillas</span>
          <button className="diagrams-list__close" onClick={onClose}>
            ×
          </button>
        </div>

        <ul className="diagrams-list__items">
          {DIAGRAM_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button className="diagrams-list__item" onClick={() => onApply(t)}>
                <span className="diagrams-list__item-name">{t.name}</span>
                <span className="diagrams-list__item-meta">{t.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
