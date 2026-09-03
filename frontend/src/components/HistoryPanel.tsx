import { useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import { getDiagramHistory } from '../api/client';
import type { DiagramHistoryEntry } from '../types/history';
import { formatRelativeTime } from '../lib/format';

interface HistoryPanelProps {
  diagramId: string;
  onClose: () => void;
}

/** "Bitácora": audit trail of who changed this diagram and when. */
export function HistoryPanel({ diagramId, onClose }: HistoryPanelProps) {
  const [entries, setEntries] = useState<DiagramHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDiagramHistory(diagramId)
      .then(setEntries)
      .catch(() => setError('No se pudo cargar la bitácora.'));
  }, [diagramId]);

  return (
    <div className="diagrams-list">
      <div className="diagrams-list__backdrop" onClick={onClose} />
      <div className="diagrams-list__panel">
        <div className="diagrams-list__header">
          <span className="panel-title">
            <History size={16} /> Bitácora de cambios
          </span>
          <button className="diagrams-list__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && <p className="diagrams-list__error">{error}</p>}
        {!error && entries === null && <p>Cargando…</p>}
        {!error && entries?.length === 0 && (
          <p className="diagrams-list__empty">
            Todavía no hay cambios registrados para este diagrama.
          </p>
        )}

        <ul className="history-panel__list">
          {entries?.map((entry) => (
            <li key={entry.id} className="history-panel__item">
              <div className="history-panel__item-top">
                <span className="history-panel__user">{entry.userName}</span>
                <span className="history-panel__time" title={new Date(entry.createdAt).toLocaleString('es-ES')}>
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
              <div className="history-panel__summary">{entry.summary}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
