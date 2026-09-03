import type { UmlClass, UmlModel, UmlRelation } from './uml.types.js';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  classId?: string;
  className?: string;
  relationId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findClass(model: UmlModel, id: string): UmlClass | undefined {
  return model.classes.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// 1. Integridad estructural
// ---------------------------------------------------------------------------
function checkStructuralIntegrity(model: UmlModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nameCount = new Map<string, number>();

  for (const cls of model.classes) {
    if (!cls.name || !cls.name.trim()) {
      issues.push({
        severity: 'error',
        code: 'EMPTY_CLASS_NAME',
        message: 'Hay una clase sin nombre. Toda clase debe tener un nombre válido.',
        classId: cls.id,
      });
    } else {
      const key = normalize(cls.name);
      nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
    }

    const hasPrimaryKey = cls.attributes.some((a) => a.isPrimaryKey);
    if (cls.stereotype !== 'enum' && !hasPrimaryKey) {
      issues.push({
        severity: 'error',
        code: 'NO_PRIMARY_KEY',
        message: `La clase "${cls.name}" no tiene ningún atributo marcado como clave primaria (PK).`,
        classId: cls.id,
        className: cls.name,
      });
    }

    const attrNameCount = new Map<string, number>();
    for (const attr of cls.attributes) {
      const key = normalize(attr.name);
      attrNameCount.set(key, (attrNameCount.get(key) ?? 0) + 1);
    }
    for (const [key, count] of attrNameCount) {
      if (count > 1) {
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_ATTRIBUTE',
          message: `La clase "${cls.name}" tiene el atributo "${key}" repetido ${count} veces.`,
          classId: cls.id,
          className: cls.name,
        });
      }
    }
  }

  for (const [key, count] of nameCount) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_CLASS_NAME',
        message: `Hay ${count} clases con el mismo nombre ("${key}"). Los nombres de clase deben ser únicos.`,
      });
    }
  }

  for (const rel of model.relations) {
    const source = findClass(model, rel.sourceClassId);
    const target = findClass(model, rel.targetClassId);
    if (!source || !target) {
      issues.push({
        severity: 'error',
        code: 'INVALID_RELATION',
        message: 'Hay una relación que apunta a una clase que ya no existe en el diagrama.',
        relationId: rel.id,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Helper: para cada relación, determina qué clase "referencia" (posee la FK)
// a cuál. Reutiliza la misma semántica que el motor generador de Spring Boot.
// ---------------------------------------------------------------------------
interface ReferenceEdge {
  relation: UmlRelation;
  referencingClass: UmlClass;
  referencedClass: UmlClass;
}

function resolveReferenceEdges(model: UmlModel): ReferenceEdge[] {
  const edges: ReferenceEdge[] = [];

  for (const rel of model.relations) {
    if (rel.type === 'INHERITANCE') continue;
    const source = findClass(model, rel.sourceClassId);
    const target = findClass(model, rel.targetClassId);
    if (!source || !target) continue;

    switch (rel.type) {
      case 'ONE_TO_MANY':
      case 'COMPOSITION':
        // El lado "muchos" (target) guarda la FK hacia el origen.
        edges.push({ relation: rel, referencingClass: target, referencedClass: source });
        break;
      case 'MANY_TO_ONE':
      case 'ASSOCIATION':
      case 'AGGREGATION':
      case 'ONE_TO_ONE':
        edges.push({ relation: rel, referencingClass: source, referencedClass: target });
        break;
      case 'MANY_TO_MANY':
        // Ambos extremos "se referencian" via tabla intermedia.
        edges.push({ relation: rel, referencingClass: source, referencedClass: target });
        edges.push({ relation: rel, referencingClass: target, referencedClass: source });
        break;
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// 2. Redundancia por desnormalización (violación de 3FN)
// ---------------------------------------------------------------------------
function checkDenormalizedRedundancy(model: UmlModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const edges = resolveReferenceEdges(model);

  for (const edge of edges) {
    const referencedNameNorm = normalize(edge.referencedClass.name);

    for (const attr of edge.referencingClass.attributes) {
      if (attr.isPrimaryKey) continue;
      const attrNorm = normalize(attr.name);
      if (!attrNorm.startsWith(referencedNameNorm) || attrNorm === referencedNameNorm) {
        continue;
      }

      const suffix = attrNorm.slice(referencedNameNorm.length);
      const matchesOwnAttribute = edge.referencedClass.attributes.some(
        (refAttr) => !refAttr.isPrimaryKey && normalize(refAttr.name) === suffix,
      );

      if (matchesOwnAttribute) {
        issues.push({
          severity: 'warning',
          code: 'DENORMALIZED_ATTRIBUTE',
          message:
            `La clase "${edge.referencingClass.name}" tiene el atributo "${attr.name}", que parece copiar ` +
            `un dato de "${edge.referencedClass.name}" (ya relacionada). Esto duplica información que depende ` +
            `de la clave de "${edge.referencedClass.name}", no de la clave propia de "${edge.referencingClass.name}" ` +
            `— viola la Tercera Forma Normal (3FN). Considera acceder a ese dato a través de la relación en vez ` +
            `de copiarlo.`,
          classId: edge.referencingClass.id,
          className: edge.referencingClass.name,
          relationId: edge.relation.id,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 3. Claves foráneas manuales redundantes
// ---------------------------------------------------------------------------
function checkRedundantManualForeignKeys(model: UmlModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const edges = resolveReferenceEdges(model);

  for (const edge of edges) {
    const referencedNameNorm = normalize(edge.referencedClass.name);

    for (const attr of edge.referencingClass.attributes) {
      if (attr.isPrimaryKey) continue;
      const attrNorm = normalize(attr.name);
      const looksLikeManualFk =
        attrNorm === `${referencedNameNorm}id` || attrNorm === `id${referencedNameNorm}`;

      if (looksLikeManualFk) {
        issues.push({
          severity: 'warning',
          code: 'REDUNDANT_MANUAL_FK',
          message:
            `La clase "${edge.referencingClass.name}" tiene un atributo "${attr.name}" que parece una clave ` +
            `foránea manual hacia "${edge.referencedClass.name}", pero ya existe una relación real entre ambas ` +
            `clases. El generador crea automáticamente esa clave foránea (@JoinColumn) a partir de la relación — ` +
            `este atributo es redundante y puede eliminarse.`,
          classId: edge.referencingClass.id,
          className: edge.referencingClass.name,
          relationId: edge.relation.id,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
export function validateModel(model: UmlModel): ValidationResult {
  const structural = checkStructuralIntegrity(model);
  const denormalized = checkDenormalizedRedundancy(model);
  const redundantFks = checkRedundantManualForeignKeys(model);

  const all = [...structural, ...denormalized, ...redundantFks];
  const errors = all.filter((i) => i.severity === 'error');
  const warnings = all.filter((i) => i.severity === 'warning');

  return { valid: errors.length === 0, errors, warnings };
}
