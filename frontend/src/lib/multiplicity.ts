import type { RelationType } from '../types/uml';

export interface EndMultiplicity {
  lower: string;
  upper: string;
}

/**
 * Multiplicity at the TARGET end, as seen from the source — mirrors
 * backend/src/diagrams/xmi.util.ts so the canvas and the XMI export agree.
 */
export function targetMultiplicity(type: RelationType): EndMultiplicity {
  switch (type) {
    case 'ONE_TO_ONE':
      return { lower: '1', upper: '1' };
    case 'ONE_TO_MANY':
    case 'AGGREGATION':
    case 'COMPOSITION':
      // aggregation/composition: the source is the whole (diamond end), the target the parts
      return { lower: '0', upper: '*' };
    case 'MANY_TO_ONE':
      return { lower: '1', upper: '1' };
    case 'MANY_TO_MANY':
      return { lower: '0', upper: '*' };
    default:
      return { lower: '0', upper: '1' };
  }
}

/** Multiplicity at the SOURCE end, as seen from the target. */
export function sourceMultiplicity(type: RelationType): EndMultiplicity {
  switch (type) {
    case 'ONE_TO_ONE':
      return { lower: '1', upper: '1' };
    case 'ONE_TO_MANY':
    case 'COMPOSITION':
      return { lower: '1', upper: '1' };
    case 'AGGREGATION':
      // a shared part may exist without its whole
      return { lower: '0', upper: '1' };
    case 'MANY_TO_ONE':
    case 'ASSOCIATION':
      return { lower: '0', upper: '*' };
    case 'MANY_TO_MANY':
      return { lower: '0', upper: '*' };
    default:
      return { lower: '0', upper: '1' };
  }
}

/** UML multiplicity typed by the user: "1", "*", "0..1", "2..5", "1..*". */
export const MULTIPLICITY_PATTERN = /^(\d+|\*)(\.\.(\d+|\*))?$/;

export function isValidMultiplicity(value: string): boolean {
  if (!MULTIPLICITY_PATTERN.test(value)) return false;
  const [lower, upper] = value.split('..');
  if (upper === undefined) return true; // "1", "*"
  if (lower === '*') return false; // "*..5"
  return upper === '*' || Number(lower) <= Number(upper); // "5..2" is not a range
}

/** Multiplicity shown at each end: the user's value when set, otherwise the one implied by the type. */
export function endLabels(
  type: RelationType,
  custom: { sourceMultiplicity?: string; targetMultiplicity?: string },
): { source: string; target: string } {
  return {
    source: custom.sourceMultiplicity || formatMultiplicity(sourceMultiplicity(type)),
    target: custom.targetMultiplicity || formatMultiplicity(targetMultiplicity(type)),
  };
}

export function formatMultiplicity(m: EndMultiplicity): string {
  return m.lower === m.upper ? m.lower : `${m.lower}..${m.upper}`;
}

/** Relation types with real UML multiplicity semantics (as opposed to Inheritance/Dependency). */
export const MULTIPLICITY_RELATION_TYPES = new Set<RelationType>([
  'ASSOCIATION',
  'AGGREGATION',
  'COMPOSITION',
  'ONE_TO_ONE',
  'ONE_TO_MANY',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
]);

/**
 * UML 2.5 §10.4 InterfaceRealization: a class (not an interface) that "inherits" from an
 * interface realizes it — dashed line with a hollow triangle, instead of the solid line of a
 * Generalization. The model keeps the INHERITANCE type (the generator already turns an
 * interface target into "implements"); only the notation and the XMI element change.
 */
export function isRealization(
  type: RelationType,
  sourceStereotype?: string,
  targetStereotype?: string,
): boolean {
  return type === 'INHERITANCE' && targetStereotype === 'interface' && sourceStereotype !== 'interface';
}

export const REALIZATION_DASH = '6 4';

export type EdgeVisualKind ='inheritance' | 'composition' | 'aggregation' | 'dependency' | 'plain';

export function edgeVisualKind(type: RelationType): EdgeVisualKind {
  switch (type) {
    case 'INHERITANCE':
      return 'inheritance';
    case 'COMPOSITION':
      return 'composition';
    case 'AGGREGATION':
      return 'aggregation';
    case 'DEPENDENCY':
      return 'dependency';
    default:
      return 'plain';
  }
}

interface EdgeAppearance {
  style: { strokeDasharray?: string } | undefined;
  markerStart: string | undefined;
  markerEnd: string | undefined;
}

/**
 * Marker + line style for a relation type, standard UML 2.5 notation. Always
 * returns all three keys (possibly undefined) so spreading the result over
 * an existing edge fully replaces its previous appearance, e.g. when the
 * user changes a relation's type in the inspector.
 */
export function edgeAppearance(type: RelationType): EdgeAppearance {
  // React Flow wraps a bare marker id in url(#id) itself when resolving
  // edge.markerStart/markerEnd — passing an already-wrapped string here
  // double-wraps it and the marker silently fails to render.
  switch (edgeVisualKind(type)) {
    case 'inheritance':
      return { style: undefined, markerStart: undefined, markerEnd: 'uml-triangle' };
    case 'composition':
      return { style: undefined, markerStart: 'uml-diamond-filled', markerEnd: undefined };
    case 'aggregation':
      return { style: undefined, markerStart: 'uml-diamond-hollow', markerEnd: undefined };
    case 'dependency':
      return {
        style: { strokeDasharray: '5 5' },
        markerStart: undefined,
        markerEnd: 'uml-open-arrow',
      };
    default:
      return { style: undefined, markerStart: undefined, markerEnd: undefined };
  }
}
