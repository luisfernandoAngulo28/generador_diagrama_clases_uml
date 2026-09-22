import type { UmlModel } from '../types/uml';

export interface ClassDiff {
  classId: string;
  name: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  addedAttributes: string[];
  removedAttributes: string[];
  oldName?: string;
  changesDescription?: string;
}

export interface RelationDiff {
  id: string;
  sourceName: string;
  targetName: string;
  type: string;
  status: 'added' | 'removed' | 'unchanged';
}

export interface DetailedDiffResult {
  classes: ClassDiff[];
  relations: RelationDiff[];
  summary: {
    addedClasses: number;
    removedClasses: number;
    modifiedClasses: number;
    unchangedClasses: number;
    addedRelations: number;
    removedRelations: number;
  };
}

export function computeDetailedModelDiff(
  oldModel: UmlModel,
  newModel: UmlModel,
): DetailedDiffResult {
  const oldClasses = oldModel?.classes ?? [];
  const newClasses = newModel?.classes ?? [];
  const oldRelations = oldModel?.relations ?? [];
  const newRelations = newModel?.relations ?? [];

  const oldById = new Map(oldClasses.map((c) => [c.id, c]));
  const newById = new Map(newClasses.map((c) => [c.id, c]));

  const classesDiff: ClassDiff[] = [];

  // Check classes in newModel
  for (const newCls of newClasses) {
    const oldCls = oldById.get(newCls.id);
    if (!oldCls) {
      classesDiff.push({
        classId: newCls.id,
        name: newCls.name,
        status: 'added',
        addedAttributes: (newCls.attributes ?? []).map((a) => `${a.name}: ${a.type}`),
        removedAttributes: [],
      });
    } else {
      const oldAttrMap = new Map((oldCls.attributes ?? []).map((a) => [a.name, a.type]));
      const newAttrMap = new Map((newCls.attributes ?? []).map((a) => [a.name, a.type]));

      const addedAttrs: string[] = [];
      const removedAttrs: string[] = [];
      const changedAttrs: string[] = [];

      for (const [name, type] of newAttrMap.entries()) {
        if (!oldAttrMap.has(name)) {
          addedAttrs.push(`${name}: ${type}`);
        } else if (oldAttrMap.get(name) !== type) {
          changedAttrs.push(`${name} (${oldAttrMap.get(name)} → ${type})`);
        }
      }

      for (const [name, type] of oldAttrMap.entries()) {
        if (!newAttrMap.has(name)) {
          removedAttrs.push(`${name}: ${type}`);
        }
      }

      const nameChanged = oldCls.name !== newCls.name;
      const isModified =
        nameChanged ||
        addedAttrs.length > 0 ||
        removedAttrs.length > 0 ||
        changedAttrs.length > 0 ||
        oldCls.stereotype !== newCls.stereotype;

      if (isModified) {
        const changes: string[] = [];
        if (nameChanged) changes.push(`Renombrada de "${oldCls.name}" a "${newCls.name}"`);
        if (addedAttrs.length > 0) changes.push(`+${addedAttrs.length} atributos nuevos`);
        if (removedAttrs.length > 0) changes.push(`-${removedAttrs.length} atributos quitados`);
        if (changedAttrs.length > 0) changes.push(`Tipos actualizados: ${changedAttrs.join(', ')}`);

        classesDiff.push({
          classId: newCls.id,
          name: newCls.name,
          oldName: nameChanged ? oldCls.name : undefined,
          status: 'modified',
          addedAttributes: [...addedAttrs, ...changedAttrs],
          removedAttributes: removedAttrs,
          changesDescription: changes.join('; '),
        });
      } else {
        classesDiff.push({
          classId: newCls.id,
          name: newCls.name,
          status: 'unchanged',
          addedAttributes: [],
          removedAttributes: [],
        });
      }
    }
  }

  // Check removed classes from oldModel
  for (const oldCls of oldClasses) {
    if (!newById.has(oldCls.id)) {
      classesDiff.push({
        classId: oldCls.id,
        name: oldCls.name,
        status: 'removed',
        addedAttributes: [],
        removedAttributes: (oldCls.attributes ?? []).map((a) => `${a.name}: ${a.type}`),
      });
    }
  }

  // Relations diff
  const oldRelIds = new Set(oldRelations.map((r) => r.id));
  const newRelIds = new Set(newRelations.map((r) => r.id));
  const relationsDiff: RelationDiff[] = [];

  const getClassName = (model: UmlModel, id: string) =>
    model.classes.find((c) => c.id === id)?.name ?? 'Desconocida';

  for (const newRel of newRelations) {
    if (!oldRelIds.has(newRel.id)) {
      relationsDiff.push({
        id: newRel.id,
        sourceName: getClassName(newModel, newRel.sourceClassId),
        targetName: getClassName(newModel, newRel.targetClassId),
        type: newRel.type,
        status: 'added',
      });
    } else {
      relationsDiff.push({
        id: newRel.id,
        sourceName: getClassName(newModel, newRel.sourceClassId),
        targetName: getClassName(newModel, newRel.targetClassId),
        type: newRel.type,
        status: 'unchanged',
      });
    }
  }

  for (const oldRel of oldRelations) {
    if (!newRelIds.has(oldRel.id)) {
      relationsDiff.push({
        id: oldRel.id,
        sourceName: getClassName(oldModel, oldRel.sourceClassId),
        targetName: getClassName(oldModel, oldRel.targetClassId),
        type: oldRel.type,
        status: 'removed',
      });
    }
  }

  const addedClasses = classesDiff.filter((c) => c.status === 'added').length;
  const removedClasses = classesDiff.filter((c) => c.status === 'removed').length;
  const modifiedClasses = classesDiff.filter((c) => c.status === 'modified').length;
  const unchangedClasses = classesDiff.filter((c) => c.status === 'unchanged').length;
  const addedRelations = relationsDiff.filter((r) => r.status === 'added').length;
  const removedRelations = relationsDiff.filter((r) => r.status === 'removed').length;

  return {
    classes: classesDiff,
    relations: relationsDiff,
    summary: {
      addedClasses,
      removedClasses,
      modifiedClasses,
      unchangedClasses,
      addedRelations,
      removedRelations,
    },
  };
}
