import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ToolbarMenuItem {
  key: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

interface ToolbarMenuProps {
  icon: ReactNode;
  label: string;
  items: ToolbarMenuItem[];
}

/** A toolbar button that opens a small dropdown of actions, EA/Office "File menu" style. */
export function ToolbarMenu({ icon, label, items }: ToolbarMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="toolbar-menu" ref={rootRef}>
      <button
        type="button"
        className="toolbar__btn"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon} {label}
        <ChevronDown size={13} className="toolbar-menu__chevron" />
      </button>
      {open && (
        <div className="toolbar-menu__panel" role="menu">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="toolbar-menu__item"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
