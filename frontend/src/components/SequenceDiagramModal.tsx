import { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  GitCommitHorizontal,
  Layers,
  ArrowRight,
  Database,
  Server,
  User,
  FileCode,
} from 'lucide-react';
import type { UmlModel } from '../types/uml';
import {
  getSequenceSteps,
  generateMermaidSequence,
  generatePlantUmlSequence,
  type SequenceOperation,
} from '../lib/sequenceDiagram';

interface SequenceDiagramModalProps {
  model: UmlModel;
  initialClassName?: string;
  onClose: () => void;
}

export function SequenceDiagramModal({
  model,
  initialClassName,
  onClose,
}: SequenceDiagramModalProps) {
  const classes = useMemo(() => model.classes ?? [], [model]);
  const defaultClass = classes.find((c) => c.name === initialClassName) ?? classes[0];

  const [selectedClassName, setSelectedClassName] = useState<string>(
    defaultClass?.name ?? 'Entidad',
  );
  const [selectedOp, setSelectedOp] = useState<SequenceOperation>('CREATE');
  const [activeTab, setActiveTab] = useState<'visual' | 'mermaid' | 'plantuml'>('visual');
  const [copied, setCopied] = useState(false);

  const selectedClass = classes.find((c) => c.name === selectedClassName);

  const steps = useMemo(
    () => getSequenceSteps(selectedClassName, selectedOp, model.relations),
    [selectedClassName, selectedOp, model.relations],
  );

  const plantUmlCode = useMemo(
    () =>
      generatePlantUmlSequence(
        selectedClassName,
        selectedOp,
        selectedClass?.attributes,
        model.relations,
      ),
    [selectedClassName, selectedOp, selectedClass, model.relations],
  );

  const mermaidCode = useMemo(
    () => generateMermaidSequence(selectedClassName, selectedOp, model.relations),
    [selectedClassName, selectedOp, model.relations],
  );

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPuml = () => {
    const blob = new Blob([plantUmlCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secuencia-${selectedClassName.toLowerCase()}-${selectedOp.toLowerCase()}.puml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sequence-backdrop" onClick={onClose}>
      <div className="sequence-modal" onClick={(e) => e.stopPropagation()}>
        <header className="sequence-modal__header">
          <div className="sequence-modal__title-group">
            <div className="sequence-modal__icon">
              <GitCommitHorizontal size={20} />
            </div>
            <div>
              <h3>Diagrama de Secuencia UML Dinámico</h3>
              <p>Flujo de ejecución a través de la arquitectura Spring Boot en 4 capas</p>
            </div>
          </div>
          <button className="sequence-modal__close" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </header>

        {/* Toolbar de Controles */}
        <div className="sequence-toolbar">
          <div className="sequence-toolbar__control">
            <label>Clase / Entidad:</label>
            <select
              value={selectedClassName}
              onChange={(e) => setSelectedClassName(e.target.value)}
              className="sequence-select"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sequence-toolbar__control">
            <label>Caso de Uso / Operación:</label>
            <select
              value={selectedOp}
              onChange={(e) => setSelectedOp(e.target.value as SequenceOperation)}
              className="sequence-select"
            >
              <option value="CREATE">Crear / Registrar (POST)</option>
              <option value="GET_BY_ID">Buscar por ID (GET)</option>
              <option value="LIST">Listar Catálogo (GET)</option>
              <option value="UPDATE">Actualizar (PUT)</option>
              <option value="DELETE">Eliminar (DELETE)</option>
            </select>
          </div>

          <div className="sequence-tabs">
            <button
              className={`sequence-tab ${activeTab === 'visual' ? 'sequence-tab--active' : ''}`}
              onClick={() => setActiveTab('visual')}
            >
              <Layers size={14} /> Flujo Visual
            </button>
            <button
              className={`sequence-tab ${activeTab === 'mermaid' ? 'sequence-tab--active' : ''}`}
              onClick={() => setActiveTab('mermaid')}
            >
              <FileCode size={14} /> Código Mermaid
            </button>
            <button
              className={`sequence-tab ${activeTab === 'plantuml' ? 'sequence-tab--active' : ''}`}
              onClick={() => setActiveTab('plantuml')}
            >
              <FileCode size={14} /> PlantUML
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="sequence-modal__body">
          {activeTab === 'visual' && (
            <div className="sequence-visual">
              {/* Participantes / Lifelines */}
              <div className="sequence-participants">
                <div className="sequence-participant sequence-participant--client">
                  <User size={16} />
                  <span>Usuario / Móvil</span>
                </div>
                <div className="sequence-participant sequence-participant--controller">
                  <Server size={16} />
                  <span>{selectedClassName}Controller</span>
                </div>
                <div className="sequence-participant sequence-participant--service">
                  <Layers size={16} />
                  <span>{selectedClassName}Service</span>
                </div>
                <div className="sequence-participant sequence-participant--repo">
                  <Server size={16} />
                  <span>{selectedClassName}Repository</span>
                </div>
                <div className="sequence-participant sequence-participant--db">
                  <Database size={16} />
                  <span>PostgreSQL DB</span>
                </div>
              </div>

              {/* Mensajes y Pasos en orden */}
              <div className="sequence-steps-list">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`sequence-step-card sequence-step-card--${step.type}`}
                  >
                    <div className="sequence-step-card__num">{step.id}</div>
                    <div className="sequence-step-card__main">
                      <div className="sequence-step-card__route">
                        <span className="sequence-step-badge">{step.from}</span>
                        <ArrowRight size={13} className="sequence-step-arrow" />
                        <span className="sequence-step-badge sequence-step-badge--target">
                          {step.to}
                        </span>
                      </div>
                      <div className="sequence-step-card__msg">
                        <code>{step.message}</code>
                      </div>
                      <p className="sequence-step-card__desc">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mermaid' && (
            <div className="sequence-code-view">
              <div className="sequence-code-view__actions">
                <span className="sequence-code-view__hint">
                  Compatible con GitHub Markdown, Notion y renderizadores Mermaid
                </span>
                <button
                  className="sequence-btn-copy"
                  onClick={() => handleCopy(mermaidCode)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '¡Copiado!' : 'Copiar Mermaid'}
                </button>
              </div>
              <pre className="sequence-code-block">
                <code>{mermaidCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'plantuml' && (
            <div className="sequence-code-view">
              <div className="sequence-code-view__actions">
                <span className="sequence-code-view__hint">
                  Importable en Enterprise Architect, PlantUML y VS Code
                </span>
                <div className="sequence-actions-row">
                  <button
                    className="sequence-btn-copy"
                    onClick={() => handleCopy(plantUmlCode)}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? '¡Copiado!' : 'Copiar PlantUML'}
                  </button>
                  <button className="sequence-btn-download" onClick={handleDownloadPuml}>
                    <Download size={14} /> Descargar .puml
                  </button>
                </div>
              </div>
              <pre className="sequence-code-block">
                <code>{plantUmlCode}</code>
              </pre>
            </div>
          )}
        </div>

        <footer className="sequence-modal__footer">
          <button className="sequence-modal__btn-close" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
