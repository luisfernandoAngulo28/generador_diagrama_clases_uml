import type { UmlModel } from './uml.types.js';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Produces a short, human-readable summary of what changed between two
 * versions of a diagram's model, for the "bitácora" (audit log) entry.
 * Class-level granularity (added/removed/renamed classes, added/removed
 * relations, classes with modified attributes/operations) — not a full
 * field-by-field diff.
 */
export function summarizeModelDiff(oldModel: UmlModel, newModel: UmlModel): string {
  const oldById = new Map(oldModel.classes.map((c) => [c.id, c]));
  const newById = new Map(newModel.classes.map((c) => [c.id, c]));

  const addedClasses = newModel.classes.filter((c) => !oldById.has(c.id)).map((c) => c.name);
  const removedClasses = oldModel.classes.filter((c) => !newById.has(c.id)).map((c) => c.name);
  const renamedCount = newModel.classes.filter(
    (c) => oldById.has(c.id) && oldById.get(c.id)!.name !== c.name,
  ).length;

  let modifiedCount = 0;
  for (const newCls of newModel.classes) {
    const oldCls = oldById.get(newCls.id);
    if (!oldCls) continue;
    const attrsChanged = JSON.stringify(oldCls.attributes) !== JSON.stringify(newCls.attributes);
    const opsChanged =
      JSON.stringify(oldCls.operations ?? []) !== JSON.stringify(newCls.operations ?? []);
    const stereotypeChanged = oldCls.stereotype !== newCls.stereotype;
    if (attrsChanged || opsChanged || stereotypeChanged) modifiedCount++;
  }

  const oldRelIds = new Set(oldModel.relations.map((r) => r.id));
  const newRelIds = new Set(newModel.relations.map((r) => r.id));
  const addedRelations = newModel.relations.filter((r) => !oldRelIds.has(r.id)).length;
  const removedRelations = oldModel.relations.filter((r) => !newRelIds.has(r.id)).length;
  const modifiedRelations = newModel.relations.filter((r) => {
    if (!oldRelIds.has(r.id)) return false;
    const oldRel = oldModel.relations.find((o) => o.id === r.id)!;
    return (
      oldRel.type !== r.type ||
      oldRel.sourceRole !== r.sourceRole ||
      oldRel.targetRole !== r.targetRole
    );
  }).length;

  const parts: string[] = [];
  if (addedClasses.length) {
    parts.push(`agregó ${addedClasses.length === 1 ? 'la clase' : 'las clases'} ${addedClasses.join(', ')}`);
  }
  if (removedClasses.length) {
    parts.push(`eliminó ${removedClasses.length === 1 ? 'la clase' : 'las clases'} ${removedClasses.join(', ')}`);
  }
  if (renamedCount) parts.push(`renombró ${renamedCount} clase(s)`);
  if (modifiedCount) parts.push(`modificó atributos/operaciones en ${modifiedCount} clase(s)`);
  if (addedRelations) parts.push(`agregó ${addedRelations} relación(es)`);
  if (removedRelations) parts.push(`eliminó ${removedRelations} relación(es)`);
  if (modifiedRelations) parts.push(`cambió ${modifiedRelations} relación(es)`);

  if (parts.length === 0) return 'Guardó el diagrama sin cambios detectados en el modelo';
  return capitalize(parts.join('; '));
}
