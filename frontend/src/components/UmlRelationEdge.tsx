import { useEffect, useRef, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useStore, type EdgeProps, type Edge } from '@xyflow/react';
import type { Navigability, RelationType } from '../types/uml';
import {
  MULTIPLICITY_RELATION_TYPES,
  REALIZATION_DASH,
  endLabels,
  isRealization,
} from '../lib/multiplicity';

export interface UmlRelationEdgeData extends Record<string, unknown> {
  type: RelationType;
  sourceRole?: string;
  targetRole?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  navigability?: Navigability;
  associationClassId?: string;
}

const NAVIGABLE_ARROW = "url('#uml-open-arrow')";

export type UmlRelationEdgeType = Edge<UmlRelationEdgeData, 'umlRelation'>;

/** How far along the rendered curve (in px, from each end) the end labels sit. */
const LABEL_OFFSET_PX = 26;

function EndLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <div
      className="uml-edge-label"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
    >
      {text.split('\n').map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

function stereotypeOf(data: Record<string, unknown> | undefined): string | undefined {
  const cls = data?.umlClass as { stereotype?: string } | undefined;
  return cls?.stereotype;
}

export function UmlRelationEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerStart,
  markerEnd,
  data,
}: EdgeProps<UmlRelationEdgeType>) {
  const [path, midX, midY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const pathRef = useRef<SVGPathElement>(null);
  const [sourcePoint, setSourcePoint] = useState({ x: sourceX, y: sourceY });
  const [targetPoint, setTargetPoint] = useState({ x: targetX, y: targetY });

  // Sample the actual rendered curve so end labels sit on the visible path
  // instead of a straight line between the handles (edges here loop a lot,
  // since class nodes only expose top/bottom handles).
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const length = el.getTotalLength();
    if (!length) return;
    const offset = Math.min(LABEL_OFFSET_PX, length / 2);
    const p1 = el.getPointAtLength(offset);
    const p2 = el.getPointAtLength(length - offset);
    setSourcePoint({ x: p1.x, y: p1.y });
    setTargetPoint({ x: p2.x, y: p2.y });
  }, [path]);

  const type = data?.type ?? 'ASSOCIATION';
  // Read the end classes' stereotypes from the store so the notation follows a later
  // stereotype change in the inspector (class → «interface») without rebuilding the edge.
  const sourceStereotype = useStore((s) => stereotypeOf(s.nodeLookup.get(source)?.data));
  const targetStereotype = useStore((s) => stereotypeOf(s.nodeLookup.get(target)?.data));
  const edgeStyle = isRealization(type, sourceStereotype, targetStereotype)
    ? { ...style, strokeDasharray: REALIZATION_DASH }
    : style;
  const showMultiplicity = MULTIPLICITY_RELATION_TYPES.has(type);
  const multiplicity = endLabels(type, data ?? {});

  const sourceLabel = [data?.sourceRole, showMultiplicity ? multiplicity.source : null]
    .filter(Boolean)
    .join('\n');
  const targetLabel = [data?.targetRole, showMultiplicity ? multiplicity.target : null]
    .filter(Boolean)
    .join('\n');

  // UML 2.5 navigability: open arrowhead on the navigable end (only where no other marker sits).
  const navigability = showMultiplicity ? data?.navigability : undefined;
  const endMarker = navigability === 'SOURCE_TO_TARGET' && !markerEnd ? NAVIGABLE_ARROW : markerEnd;
  const startMarker =
    navigability === 'TARGET_TO_SOURCE' && !markerStart ? NAVIGABLE_ARROW : markerStart;

  // UML 2.5 association class: dashed line from the middle of the association to the class.
  const assocCenter = useStore((s) => {
    const id = data?.associationClassId;
    const n = id ? s.nodeLookup.get(id) : undefined;
    if (!n) return '';
    const { x, y } = n.internals.positionAbsolute;
    return `${x + (n.measured.width ?? 0) / 2},${y + (n.measured.height ?? 0) / 2}`;
  });

  return (
    <>
      <BaseEdge id={id} path={path} style={edgeStyle} markerStart={startMarker} markerEnd={endMarker} />
      {assocCenter && (
        <path
          d={`M ${midX},${midY} L ${assocCenter}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeDasharray="6 4"
          className="uml-assoc-class-line"
        />
      )}
      {/* Invisible twin of the same path, purely so we can sample real points along the
          curve (getPointAtLength) for end-label placement without disturbing BaseEdge's
          own rendering/click-interaction path. */}
      <path ref={pathRef} d={path} fill="none" stroke="none" aria-hidden="true" />
      <EdgeLabelRenderer>
        {sourceLabel && <EndLabel x={sourcePoint.x} y={sourcePoint.y} text={sourceLabel} />}
        {targetLabel && <EndLabel x={targetPoint.x} y={targetPoint.y} text={targetLabel} />}
      </EdgeLabelRenderer>
    </>
  );
}
