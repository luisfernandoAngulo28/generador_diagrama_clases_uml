/**
 * Standard UML 2.5 relationship-end markers (hollow triangle for
 * generalization, filled/hollow diamonds for composition/aggregation, open
 * arrow for dependency), referenced by edges via markerStart/markerEnd
 * `url(#id)` strings. Rendered once inside the ReactFlow canvas.
 */
export function UmlMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker
          id="uml-triangle"
          viewBox="0 0 20 20"
          refX="18"
          refY="10"
          markerWidth="18"
          markerHeight="18"
          orient="auto-start-reverse"
        >
          <path d="M 2 2 L 18 10 L 2 18 Z" fill="#1a1a1a" stroke="#8896a8" strokeWidth="1.5" />
        </marker>

        <marker
          id="uml-diamond-filled"
          viewBox="0 0 20 20"
          refX="1"
          refY="10"
          markerWidth="20"
          markerHeight="20"
          orient="auto-start-reverse"
        >
          <path d="M 1 10 L 10 4 L 19 10 L 10 16 Z" fill="#8896a8" stroke="#8896a8" />
        </marker>

        <marker
          id="uml-diamond-hollow"
          viewBox="0 0 20 20"
          refX="1"
          refY="10"
          markerWidth="20"
          markerHeight="20"
          orient="auto-start-reverse"
        >
          <path d="M 1 10 L 10 4 L 19 10 L 10 16 Z" fill="#1a1a1a" stroke="#8896a8" strokeWidth="1.5" />
        </marker>

        <marker
          id="uml-open-arrow"
          viewBox="0 0 20 20"
          refX="16"
          refY="10"
          markerWidth="16"
          markerHeight="16"
          orient="auto-start-reverse"
        >
          <path d="M 2 2 L 18 10 L 2 18" fill="none" stroke="#8896a8" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
}
