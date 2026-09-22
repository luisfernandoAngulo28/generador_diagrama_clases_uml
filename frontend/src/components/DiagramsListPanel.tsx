import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Search, X } from 'lucide-react';
import { listDiagrams } from '../api/client';
import type { Diagram } from '../types/uml';

interface DiagramsListPanelProps {
  onOpen: (id: string) => void;
  onClose: () => void;
}

export function DiagramsListPanel({ onOpen, onClose }: DiagramsListPanelProps) {
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listDiagrams()
      .then(setDiagrams)
      .catch(() => setError('No se pudieron cargar los diagramas.'));
  }, []);

  const filtered = useMemo(() => {
    if (!diagrams) return null;
    const q = search.trim().toLowerCase();
    if (!q) return diagrams;
    return diagrams.filter((d) => d.name.toLowerCase().includes(q));
  }, [diagrams, search]);

  return (
    <div className="diagrams-list">
      <div className="diagrams-list__backdrop" onClick={onClose} />
      <div className="diagrams-list__panel">
        <div className="diagrams-list__header">
          <span className="panel-title">
            <FolderOpen size={16} /> Mis diagramas
          </span>
          <button className="diagrams-list__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Buscador */}
        {diagrams && diagrams.length > 0 && (
          <div className="diagrams-list__search-wrap">
            <Search size={14} className="diagrams-list__search-icon" />
            <input
              className="diagrams-list__search"
              type="text"
              placeholder="Buscar diagrama…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="diagrams-list__search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {error && <p className="diagrams-list__error">{error}</p>}
        {!error && diagrams === null && <p>Cargando…</p>}
        {!error && diagrams?.length === 0 && (
          <p className="diagrams-list__empty">Todavía no hay diagramas guardados.</p>
        )}
        {!error && filtered !== null && filtered.length === 0 && search && (
          <p className="diagrams-list__empty">
            No hay diagramas que coincidan con «{search}».
          </p>
        )}

        {filtered && filtered.length > 0 && search && (
          <p className="diagrams-list__count">
            {filtered.length} de {diagrams?.length} diagrama{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        <ul className="diagrams-list__items">
          {filtered?.map((d) => (
            <li key={d.id}>
              <button className="diagrams-list__item" onClick={() => onOpen(d.id)}>
                <span className="diagrams-list__item-name">{d.name}</span>
                <span className="diagrams-list__item-meta">
                  {d.model.classes.length} clase{d.model.classes.length === 1 ? '' : 's'} ·
                  actualizado {new Date(d.updatedAt).toLocaleString('es-ES')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
