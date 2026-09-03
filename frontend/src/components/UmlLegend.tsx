import { useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';

interface LegendRow {
  symbol: ReactNode;
  label: string;
}

const RELATION_ROWS: LegendRow[] = [
  { symbol: <svg width="36" height="14" viewBox="0 0 36 14"><line x1="2" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="1.5" /></svg>, label: 'Asociación / 1:1 / 1:N / N:1 / N:M' },
  { symbol: <svg width="36" height="14" viewBox="0 0 36 14"><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" /><path d="M 22 2 L 34 7 L 22 12 Z" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.2" /></svg>, label: 'Herencia (generalización)' },
  { symbol: <svg width="36" height="14" viewBox="0 0 36 14"><line x1="14" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="1.5" /><path d="M 2 7 L 8 3 L 14 7 L 8 11 Z" fill="currentColor" /></svg>, label: 'Composición (rombo relleno = dueño)' },
  { symbol: <svg width="36" height="14" viewBox="0 0 36 14"><line x1="14" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="1.5" /><path d="M 2 7 L 8 3 L 14 7 L 8 11 Z" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.2" /></svg>, label: 'Agregación (rombo hueco)' },
  { symbol: <svg width="36" height="14" viewBox="0 0 36 14"><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /><path d="M 22 3 L 34 7 L 22 11" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>, label: 'Dependencia' },
];

const STEREOTYPE_ROWS: { badge: string; label: string }[] = [
  { badge: '«enum»', label: 'genera un enum de Java' },
  { badge: '«abstract»', label: 'clase abstracta (nombre en itálica)' },
  { badge: '«interface»', label: 'interfaz de Java (solo operaciones)' },
];

/** Small collapsible key explaining the UML 2.5 notation used on the canvas. */
export function UmlLegend() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="uml-legend__toggle" onClick={() => setOpen(true)} title="Leyenda de notación UML">
        <Info size={15} /> Leyenda
      </button>
    );
  }

  return (
    <div className="uml-legend">
      <div className="uml-legend__header">
        <span>Notación UML 2.5</span>
        <button onClick={() => setOpen(false)}>
          <X size={14} />
        </button>
      </div>
      <ul className="uml-legend__list">
        {RELATION_ROWS.map((row) => (
          <li key={row.label}>
            <span className="uml-legend__symbol">{row.symbol}</span>
            {row.label}
          </li>
        ))}
      </ul>
      <div className="uml-legend__divider" />
      <ul className="uml-legend__list">
        {STEREOTYPE_ROWS.map((row) => (
          <li key={row.badge}>
            <span className="uml-legend__badge">{row.badge}</span>
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
