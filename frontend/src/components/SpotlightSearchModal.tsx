import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Box, Tag } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { UmlClassNodeData } from './UmlClassNode';

interface SpotlightSearchModalProps {
  nodes: Node<UmlClassNodeData>[];
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}

export function SpotlightSearchModal({
  nodes,
  onSelect,
  onClose,
}: SpotlightSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clases válidas para búsqueda
  const classNodes = useMemo(() => {
    return nodes.filter((n) => n.data?.umlClass);
  }, [nodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classNodes;

    return classNodes.filter((n) => {
      const cls = n.data.umlClass;
      if (cls.name.toLowerCase().includes(q)) return true;
      if (cls.stereotype?.toLowerCase().includes(q)) return true;
      return cls.attributes.some((a) => a.name.toLowerCase().includes(q));
    });
  }, [classNodes, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex].id);
        onClose();
      }
    }
  }

  return (
    <div className="spotlight-backdrop" onClick={onClose}>
      <div
        className="spotlight-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="spotlight-modal__search-bar">
          <Search size={18} className="spotlight-modal__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="spotlight-modal__input"
            placeholder="Buscar clase o atributo en el lienzo (flechas ↑↓ y Enter)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="spotlight-modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="spotlight-modal__results">
          {filtered.length === 0 ? (
            <div className="spotlight-modal__empty">
              No se encontraron clases coincidentes con "{query}".
            </div>
          ) : (
            filtered.map((n, i) => {
              const cls = n.data.umlClass;
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={n.id}
                  className={`spotlight-modal__item ${
                    isSelected ? 'spotlight-modal__item--selected' : ''
                  }`}
                  onClick={() => {
                    onSelect(n.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Box size={16} className="spotlight-modal__item-icon" />
                  <div className="spotlight-modal__item-info">
                    <div className="spotlight-modal__item-title">
                      <span className="spotlight-modal__class-name">{cls.name}</span>
                      {cls.stereotype && (
                        <span className="spotlight-modal__stereotype">
                          «{cls.stereotype}»
                        </span>
                      )}
                    </div>
                    <div className="spotlight-modal__item-sub">
                      <Tag size={11} /> {cls.attributes.length} atributo
                      {cls.attributes.length === 1 ? '' : 's'}:{' '}
                      {cls.attributes.map((a) => a.name).slice(0, 5).join(', ')}
                      {cls.attributes.length > 5 ? '…' : ''}
                    </div>
                  </div>
                  <kbd className="spotlight-modal__kbd">↵</kbd>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
