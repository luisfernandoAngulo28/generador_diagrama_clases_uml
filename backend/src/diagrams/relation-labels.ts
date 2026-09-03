import type { RelationType } from './uml.types.js';

/** Mirrors frontend/src/types/uml.ts RELATION_LABELS, kept in sync manually. */
export const RELATION_LABELS: Record<RelationType, string> = {
  ASSOCIATION: 'Asociación',
  AGGREGATION: 'Agregación',
  COMPOSITION: 'Composición',
  INHERITANCE: 'Herencia',
  ONE_TO_ONE: '1 : 1',
  ONE_TO_MANY: '1 : N',
  MANY_TO_ONE: 'N : 1',
  MANY_TO_MANY: 'N : M',
};
