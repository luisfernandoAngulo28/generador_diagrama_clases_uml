import { useEffect, useRef, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react';
import type { RelationType } from '../types/uml';
import {
  MULTIPLICITY_RELATION_TYPES,
  formatMultiplicity,
  sourceMultiplicity,
  targetMultiplicity,
} from '../lib/multiplicity';

export interface UmlRelationEdgeData extends Record<string, unknown> {
  type: RelationType;
  sourceRole?: string;
  targetRole?: string;
}

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

export function UmlRelationEdge({
  id,
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
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
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
  const showMultiplicity = MULTIPLICITY_RELATION_TYPES.has(type);

  const sourceLabel = [
    data?.sourceRole,
    showMultiplicity ? formatMultiplicity(sourceMultiplicity(type)) : null,
  ]
    .filter(Boolean)
    .join('\n');
  const targetLabel = [
    data?.targetRole,
    showMultiplicity ? formatMultiplicity(targetMultiplicity(type)) : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerStart={markerStart} markerEnd={markerEnd} />
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
