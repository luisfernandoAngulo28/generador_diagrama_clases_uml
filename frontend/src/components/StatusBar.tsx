import { Radio, Gauge, Terminal, Keyboard, Search } from 'lucide-react';
import type { UmlModel } from '../types/uml';
import { computeModelMetrics } from '../lib/metrics';
import { useMemo } from 'react';

interface StatusBarProps {
  model: UmlModel;
  connected: boolean;
  activeUsersCount: number;
  lastSavedAt: Date | null;
  viewMode: 'uml' | 'der';
  onOpenMetrics: () => void;
  onOpenRunnerApi: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
}

export function StatusBar({
  model,
  connected,
  activeUsersCount,
  lastSavedAt,
  viewMode,
  onOpenMetrics,
  onOpenRunnerApi,
  onOpenCommandPalette,
  onOpenShortcuts,
}: StatusBarProps) {
  const metrics = useMemo(() => computeModelMetrics(model), [model]);

  return (
    <footer className="app-status-bar" role="contentinfo">
      {/* Left section: Live stats & collaboration */}
      <div className="status-bar__section status-bar__section--left">
        <div
          className={`status-bar__pill ${
            connected ? 'status-bar__pill--connected' : 'status-bar__pill--disconnected'
          }`}
          title={connected ? `Conectado al servidor WebSocket (${activeUsersCount} usuarios en sala)` : 'Desconectado del servidor'}
        >
          <Radio size={12} className={connected ? 'status-bar__pulse' : ''} />
          <span>{connected ? `En vivo (${activeUsersCount})` : 'Offline'}</span>
        </div>

        <span className="status-bar__divider" />

        <div className="status-bar__item">
          <span>{model.classes.length} clases</span>
        </div>

        <div className="status-bar__item">
          <span>{model.relations.length} relaciones</span>
        </div>

        <span className="status-bar__divider" />

        <button
          className="status-bar__btn status-bar__btn--metrics"
          onClick={onOpenMetrics}
          title="Ver métricas de calidad de software OO (SOLID / Chidamber & Kemerer)"
        >
          <Gauge size={12} />
          <span>Calidad OO: {metrics.overallScore}%</span>
        </button>

        <button
          className="status-bar__btn status-bar__btn--api"
          onClick={onOpenRunnerApi}
          title="Abrir simulador y runner de API Mock en el navegador"
        >
          <Terminal size={12} />
          <span>API Mock</span>
        </button>
      </div>

      {/* Right section: System state & ergonomics */}
      <div className="status-bar__section status-bar__section--right">
        <div className="status-bar__item status-bar__item--mode">
          <span>Modo: {viewMode.toUpperCase()}</span>
        </div>

        {lastSavedAt && (
          <div className="status-bar__item status-bar__item--saved" title={lastSavedAt.toLocaleString()}>
            <span>Guardado {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}

        <button
          className="status-bar__btn status-bar__btn--cmd"
          onClick={onOpenCommandPalette}
          title="Abrir paleta rápida de comandos (Ctrl + K)"
        >
          <Search size={12} />
          <kbd>Ctrl</kbd>+<kbd>K</kbd>
        </button>

        <button
          className="status-bar__btn"
          onClick={onOpenShortcuts}
          title="Ver atajos de teclado y ayuda"
        >
          <Keyboard size={12} />
          <span>Atajos</span>
        </button>
      </div>
    </footer>
  );
}
