import { Plus, LayoutTemplate, Camera, Keyboard, Sparkles, Lightbulb } from 'lucide-react';

interface CanvasEmptyStateProps {
  onAddClass: () => void;
  onOpenTemplates: () => void;
  onScanPhoto: () => void;
  onOpenShortcuts: () => void;
}

export function CanvasEmptyState({
  onAddClass,
  onOpenTemplates,
  onScanPhoto,
  onOpenShortcuts,
}: CanvasEmptyStateProps) {
  return (
    <div className="canvas-empty-state">
      <div className="canvas-empty-state__card">
        <div className="canvas-empty-state__badge">
          <Sparkles size={14} /> Espacio de Trabajo UML
        </div>

        <h2 className="canvas-empty-state__title">Diseña tu Arquitectura de Software</h2>
        <p className="canvas-empty-state__subtitle">
          Comienza creando tu primera entidad o acelera tu diseño utilizando una plantilla de ingeniería preconfigurada.
        </p>

        <div className="canvas-empty-state__actions">
          <button className="canvas-empty-btn canvas-empty-btn--primary" onClick={onAddClass}>
            <Plus size={18} />
            <div className="canvas-empty-btn__text">
              <span className="canvas-empty-btn__title">Crear Primera Clase</span>
              <span className="canvas-empty-btn__desc">Añade una entidad al lienzo</span>
            </div>
          </button>

          <button className="canvas-empty-btn" onClick={onOpenTemplates}>
            <LayoutTemplate size={18} className="canvas-empty-btn__icon--accent" />
            <div className="canvas-empty-btn__text">
              <span className="canvas-empty-btn__title">Cargar Plantilla</span>
              <span className="canvas-empty-btn__desc">E-Commerce, Escuela, etc.</span>
            </div>
          </button>

          <button className="canvas-empty-btn" onClick={onScanPhoto}>
            <Camera size={18} className="canvas-empty-btn__icon--camera" />
            <div className="canvas-empty-btn__text">
              <span className="canvas-empty-btn__title">Escanear Boceto</span>
              <span className="canvas-empty-btn__desc">Reconoce diagramas con IA</span>
            </div>
          </button>

          <button className="canvas-empty-btn" onClick={onOpenShortcuts}>
            <Keyboard size={18} className="canvas-empty-btn__icon--shortcuts" />
            <div className="canvas-empty-btn__text">
              <span className="canvas-empty-btn__title">Atajos de Teclado</span>
              <span className="canvas-empty-btn__desc">Ctrl+K, Supr, Doble clic</span>
            </div>
          </button>
        </div>

        <div className="canvas-empty-state__footer">
          <span className="canvas-empty-state__tip">
            <Lightbulb size={14} className="canvas-empty-state__tip-icon" />
            <span>
              <strong>Tip para desarrolladores:</strong> Haz clic derecho en el lienzo para crear elementos o presiona <kbd>Ctrl</kbd> + <kbd>K</kbd> para la Paleta de Comandos.
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
