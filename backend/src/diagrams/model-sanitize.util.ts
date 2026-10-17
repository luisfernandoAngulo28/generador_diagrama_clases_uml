import type { UmlModel } from './uml.types.js';

/**
 * Normalizes a model before diffing/storing it. With PostgreSQL (jsonb) the
 * `undefined` fields of the DTO instances vanished on JSON.stringify; the
 * MongoDB driver stores them as `null`, which made the diff report phantom
 * changes (null !== undefined) and broke canvas positions. This drops
 * null/undefined object fields recursively and any non-finite position.
 */
export function sanitizeModel(model: UmlModel): UmlModel {
  const clean = stripEmpty(model) as UmlModel;
  for (const item of [...clean.classes, ...(clean.notes ?? [])]) {
    const pos = item.position;
    if (pos && !(Number.isFinite(pos.x) && Number.isFinite(pos.y))) delete item.position;
  }
  return clean;
}

function stripEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEmpty);
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v === null || v === undefined) continue;
    out[key] = stripEmpty(v);
  }
  return out;
}
