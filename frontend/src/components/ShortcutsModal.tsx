import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], desc: 'Deshacer la última acción realizada en el diagrama' },
  { keys: ['Ctrl', 'Y'], desc: 'Rehacer el cambio deshecho' },
  { keys: ['Ctrl', 'F'], desc: 'Buscador rápido spotlight de clases en el lienzo' },
  { keys: ['Supr'], desc: 'Eliminar las clases seleccionadas' },
  { keys: ['Doble clic'], desc: 'Abrir inspector de clase y panel de propiedades' },
  { keys: ['Arrastrar nodo'], desc: 'Mover y reposicionar clase en el lienzo' },
  { keys: ['Arrastrar conector'], desc: 'Crear nueva relación UML entre clases' },
  { keys: ['Clic en relación'], desc: 'Editar tipo de relación, multiplicidad y roles' },
  { keys: ['?'], desc: 'Abrir esta guía de atajos de teclado' },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div className="shortcuts-backdrop" onClick={onClose}>
      <div
        className="shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="shortcuts-modal__header">
          <div className="shortcuts-modal__title-group">
            <Keyboard size={20} className="shortcuts-modal__icon" />
            <h3>Atajos de Teclado y Comandos Rápidos</h3>
          </div>
          <button className="shortcuts-modal__close" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </header>

        <div className="shortcuts-modal__body">
          <div className="shortcuts-modal__grid">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="shortcuts-modal__row">
                <div className="shortcuts-modal__keys">
                  {s.keys.map((k) => (
                    <kbd key={k} className="shortcuts-modal__kbd">
                      {k}
                    </kbd>
                  ))}
                </div>
                <span className="shortcuts-modal__desc">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
