import { useEffect, useState } from 'react';
import { GitBranch, RotateCcw, Sparkles, X } from 'lucide-react';
import { listDiagramVersions, restoreDiagramVersion } from '../api/client';
import type { DiagramVersion } from '../types/version';
import { formatRelativeTime } from '../lib/format';

interface VersionsPanelProps {
  diagramId: string;
  /** Saves the canvas first, so unsaved work becomes a version and is not lost. */
  onBeforeRestore: () => Promise<unknown>;
  /** Reloads the canvas with the restored model. */
  onRestored: (versionNumber: number) => Promise<void> | void;
  onClose: () => void;
}

/**
 * "Versiones": the diagram's version history. Each save with real changes is
 * a snapshot of the model (consecutive autosaves of one person are merged), and
 * any of them can be restored. Restoring never rewrites history: it creates a
 * new version and is recorded in the bitácora.
 */
export function VersionsPanel({ diagramId, onBeforeRestore, onRestored, onClose }: VersionsPanelProps) {
  const [versions, setVersions] = useState<DiagramVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    listDiagramVersions(diagramId)
      .then(setVersions)
      .catch(() => setError('No se pudo cargar el historial de versiones.'));
  }, [diagramId]);

  async function restore(version: DiagramVersion) {
    const ok = window.confirm(
      `¿Restaurar la versión ${version.number} (${version.classCount} clases)?\n\n` +
        'El diagrama actual no se pierde: queda guardado como una versión más, y la restauración ' +
        'se registra en la bitácora.',
    );
    if (!ok) return;
    setRestoring(version.id);
    try {
      await onBeforeRestore();
      await restoreDiagramVersion(diagramId, version.id);
      await onRestored(version.number);
      onClose();
    } catch {
      setError(`No se pudo restaurar la versión ${version.number}.`);
      setRestoring(null);
    }
  }

  const latest = versions?.[0]?.number;

  return (
    <div className="diagrams-list">
      <div className="diagrams-list__backdrop" onClick={onClose} />
      <div className="diagrams-list__panel">
        <div className="diagrams-list__header">
          <span className="panel-title">
            <GitBranch size={16} /> Historial de versiones
          </span>
          <button className="diagrams-list__close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <p className="versions-panel__hint">
          Una versión por cada sesión de edición de una persona. Restaurar crea una versión nueva:
          nunca se borra el historial.
        </p>

        {error && <p className="diagrams-list__error">{error}</p>}
        {!error && versions === null && <p>Cargando…</p>}
        {!error && versions?.length === 0 && (
          <p className="diagrams-list__empty">Todavía no hay versiones: se crean al guardar cambios.</p>
        )}

        <ul className="history-panel__list">
          {versions?.map((v) => (
            <li key={v.id} className="history-panel__item">
              <div className="history-panel__item-top">
                <span className="history-panel__user">
                  Versión {v.number} · {v.author.userName}
                  {v.source === 'AI' && (
                    <span className="versions-panel__badge" title="Cambio aplicado por el Moderador IA">
                      <Sparkles size={11} /> vía IA
                    </span>
                  )}
                  {v.number === latest && <span className="versions-panel__badge">actual</span>}
                </span>
                <span className="history-panel__time" title={new Date(v.updatedAt).toLocaleString('es-ES')}>
                  {formatRelativeTime(v.updatedAt)}
                </span>
              </div>
              <div className="history-panel__summary">
                {v.summary}
                {v.changesCount > 1 && ` (+${v.changesCount - 1} cambios más)`}
              </div>
              <div className="versions-panel__footer">
                <span>
                  {v.classCount} clases · {v.relationCount} relaciones
                </span>
                {v.number !== latest && (
                  <button
                    className="versions-panel__restore"
                    disabled={restoring !== null}
                    onClick={() => void restore(v)}
                  >
                    <RotateCcw size={13} /> {restoring === v.id ? 'Restaurando…' : 'Restaurar'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
