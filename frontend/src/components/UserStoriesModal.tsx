import { useState, useMemo } from 'react';
import {
  X,
  BookOpenCheck,
  Copy,
  Check,
  Download,
  Filter,
  User,
  CheckCircle2,
  BookmarkCheck,
} from 'lucide-react';
import type { UmlModel } from '../types/uml';
import {
  generateUserStories,
  exportUserStoriesMarkdown,
  type UserStory,
} from '../lib/userStories';

interface UserStoriesModalProps {
  model: UmlModel;
  diagramName: string;
  onClose: () => void;
}

export function UserStoriesModal({ model, diagramName, onClose }: UserStoriesModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const allStories = useMemo(() => generateUserStories(model), [model]);

  const filteredStories = useMemo(() => {
    if (selectedClass === 'ALL') return allStories;
    return allStories.filter((s) => s.className === selectedClass);
  }, [allStories, selectedClass]);

  const totalPoints = useMemo(
    () => allStories.reduce((acc, s) => acc + s.storyPoints, 0),
    [allStories],
  );

  const handleCopyMarkdown = async () => {
    const md = exportUserStoriesMarkdown(allStories, diagramName);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = exportUserStoriesMarkdown(allStories, diagramName);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historias_usuario_${diagramName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stories-backdrop" onClick={onClose}>
      <div className="stories-modal" onClick={(e) => e.stopPropagation()}>
        <header className="stories-modal__header">
          <div className="stories-modal__title-group">
            <div className="stories-modal__icon">
              <BookOpenCheck size={20} />
            </div>
            <div>
              <h3>Historias de Usuario (Scrum) y Criterios Gherkin</h3>
              <p>Mapeo de requerimientos ágiles y BDD a partir del modelo UML de clases</p>
            </div>
          </div>
          <button className="stories-modal__close" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </header>

        {/* Toolbar de filtros y exportación */}
        <div className="stories-toolbar">
          <div className="stories-toolbar__filter">
            <Filter size={14} />
            <label>Filtrar por Entidad:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="stories-select"
            >
              <option value="ALL">Todas las entidades ({allStories.length})</option>
              {model.classes?.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="stories-toolbar__stats">
            <span>{allStories.length} Historias</span>
            <span>·</span>
            <span>{totalPoints} Story Points totales</span>
          </div>

          <div className="stories-toolbar__actions">
            <button className="stories-btn stories-btn--copy" onClick={handleCopyMarkdown}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar Markdown'}
            </button>
            <button className="stories-btn stories-btn--download" onClick={handleDownloadMarkdown}>
              <Download size={14} /> Descargar .md
            </button>
          </div>
        </div>

        {/* Lista de Historias de Usuario */}
        <div className="stories-modal__body">
          {filteredStories.length === 0 ? (
            <div className="stories-empty">
              <p>No hay historias de usuario para mostrar. Agrega clases al diagrama.</p>
            </div>
          ) : (
            <div className="stories-list">
              {filteredStories.map((story: UserStory) => (
                <article key={story.id} className="story-card">
                  <div className="story-card__header">
                    <div className="story-card__code-badge">{story.code}</div>
                    <h4 className="story-card__title">{story.title}</h4>
                    <div className="story-card__badges">
                      <span
                        className={`story-badge story-badge--priority-${story.priority.toLowerCase()}`}
                      >
                        Prioridad {story.priority}
                      </span>
                      <span className="story-badge story-badge--points">
                        {story.storyPoints} pts
                      </span>
                    </div>
                  </div>

                  {/* Narrativa Ágil */}
                  <div className="story-narrative">
                    <div className="story-narrative__row">
                      <span className="story-narrative__keyword">
                        <User size={13} /> Como
                      </span>
                      <span className="story-narrative__text story-narrative__text--role">
                        {story.role}
                      </span>
                    </div>
                    <div className="story-narrative__row">
                      <span className="story-narrative__keyword">
                        <BookmarkCheck size={13} /> Quiero
                      </span>
                      <span className="story-narrative__text">{story.want}</span>
                    </div>
                    <div className="story-narrative__row">
                      <span className="story-narrative__keyword">
                        <CheckCircle2 size={13} /> Para
                      </span>
                      <span className="story-narrative__text">{story.soThat}</span>
                    </div>
                  </div>

                  {/* Criterios de Aceptación Gherkin */}
                  <div className="story-scenarios">
                    <h5>Criterios de Aceptación (Gherkin BDD):</h5>
                    <div className="story-scenarios__list">
                      {story.scenarios.map((sc, i) => (
                        <div key={i} className="gherkin-scenario">
                          <span className="gherkin-scenario__title">
                            Escenario {i + 1}: {sc.title}
                          </span>
                          <div className="gherkin-scenario__steps">
                            <div className="gherkin-step">
                              <strong className="gherkin-kw gherkin-kw--given">Dado</strong>
                              <span>{sc.given}</span>
                            </div>
                            <div className="gherkin-step">
                              <strong className="gherkin-kw gherkin-kw--when">Cuando</strong>
                              <span>{sc.when}</span>
                            </div>
                            <div className="gherkin-step">
                              <strong className="gherkin-kw gherkin-kw--then">Entonces</strong>
                              <span>{sc.then}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="stories-modal__footer">
          <button className="stories-modal__btn-close" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
