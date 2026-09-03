import { useState } from 'react';
import type { Node } from '@xyflow/react';
import type { UmlClassNodeData } from './UmlClassNode';

interface ClassTreePanelProps {
  nodes: Node<UmlClassNodeData>[];
  onSelect: (nodeId: string) => void;
}

export function ClassTreePanel({ nodes, onSelect }: ClassTreePanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button className="class-tree__expand" onClick={() => setCollapsed(false)} title="Mostrar árbol de clases">
        ▶
      </button>
    );
  }

  return (
    <aside className="class-tree">
      <div className="class-tree__header">
        <span>Modelo</span>
        <button className="class-tree__collapse" onClick={() => setCollapsed(true)} title="Ocultar">
          ◀
        </button>
      </div>
      {nodes.length === 0 ? (
        <p className="class-tree__empty">Sin clases todavía</p>
      ) : (
        <ul className="class-tree__list">
          {nodes.map((n) => (
            <li key={n.id}>
              <button className="class-tree__item" onClick={() => onSelect(n.id)}>
                <span className="class-tree__icon">▭</span>
                {n.data.umlClass.name}
                {n.data.umlClass.stereotype && (
                  <span className="class-tree__stereotype">«{n.data.umlClass.stereotype}»</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
