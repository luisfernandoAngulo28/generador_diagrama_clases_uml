import { PencilRuler, Sparkles, Users } from 'lucide-react';

interface AiModeBarProps {
  diagramName: string;
  classCount: number;
  relationCount: number;
  /** People in the room; 0 until the diagram is saved and has a room. */
  collaboratorCount: number;
  onExit: () => void;
}

/** Replaces the editing toolbar in Modo IA: nothing to draw with, only where you are and the way back. */
export function AiModeBar({ diagramName, classCount, relationCount, collaboratorCount, onExit }: AiModeBarProps) {
  return (
    <header className="ai-mode-bar">
      <span className="ai-mode-bar__title">
        <Sparkles size={16} /> Modo IA
      </span>
      <span className="ai-mode-bar__diagram" title={diagramName}>
        {diagramName}
      </span>
      <span className="ai-mode-bar__stats">
        {classCount} clases · {relationCount} rel
      </span>
      {collaboratorCount > 0 && (
        <span className="ai-mode-bar__stats">
          <Users size={13} /> {collaboratorCount} conectado{collaboratorCount === 1 ? '' : 's'}
        </span>
      )}
      <button type="button" className="ai-mode-bar__exit" onClick={onExit}>
        <PencilRuler size={14} /> Volver al lienzo
      </button>
    </header>
  );
}
