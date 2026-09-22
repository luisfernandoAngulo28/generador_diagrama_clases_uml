import type { UmlModel } from '../types/uml';

export interface SingleClassMetric {
  classId: string;
  className: string;
  cbo: number; // Coupling Between Object Classes
  dit: number; // Depth of Inheritance Tree
  noc: number; // Number of Children
  attributeCount: number;
  operationCount: number;
  isGodClass: boolean;
  health: 'good' | 'warning' | 'danger';
  healthScore: number; // 0 - 100
}

export interface MetricsReport {
  overallScore: number; // 0 - 100
  totalClasses: number;
  averageCbo: number;
  maxDit: number;
  godClassesCount: number;
  classMetrics: SingleClassMetric[];
  recommendations: string[];
}

/**
 * Computes Chidamber & Kemerer object-oriented design metrics for a given UML model:
 * - CBO (Coupling Between Object classes)
 * - DIT (Depth of Inheritance Tree)
 * - NOC (Number of Children)
 * - God Class detection (SRP violation)
 * - Overall Architectural Health Score (0-100%)
 */
export function computeModelMetrics(model: UmlModel): MetricsReport {
  const classes = model.classes ?? [];
  const relations = model.relations ?? [];

  if (classes.length === 0) {
    return {
      overallScore: 100,
      totalClasses: 0,
      averageCbo: 0,
      maxDit: 0,
      godClassesCount: 0,
      classMetrics: [],
      recommendations: ['El diagrama aún no tiene clases. Agrega clases para calcular las métricas OO.'],
    };
  }

  // 1. Build inheritance map: childId -> parentId
  const parentMap = new Map<string, string>();
  const childrenMap = new Map<string, string[]>();

  for (const rel of relations) {
    if (rel.type === 'INHERITANCE') {
      // In UML, source is the subclass (child) inheriting from target (parent)
      parentMap.set(rel.sourceClassId, rel.targetClassId);
      const existing = childrenMap.get(rel.targetClassId) ?? [];
      existing.push(rel.sourceClassId);
      childrenMap.set(rel.targetClassId, existing);
    }
  }

  // Helper to compute DIT with cycle detection
  function computeDit(classId: string, visited = new Set<string>()): number {
    if (visited.has(classId)) return 0; // Avoid infinite loops in cycles
    visited.add(classId);
    const parentId = parentMap.get(classId);
    if (!parentId) return 0;
    return 1 + computeDit(parentId, visited);
  }

  // 2. Build coupling map: for each class, set of distinct other classes it interacts with
  const couplingMap = new Map<string, Set<string>>();
  for (const cls of classes) {
    couplingMap.set(cls.id, new Set());
  }

  for (const rel of relations) {
    if (rel.sourceClassId !== rel.targetClassId) {
      couplingMap.get(rel.sourceClassId)?.add(rel.targetClassId);
      couplingMap.get(rel.targetClassId)?.add(rel.sourceClassId);
    }
  }

  // 3. Compute per-class metrics
  const classMetrics: SingleClassMetric[] = classes.map((cls) => {
    const cbo = couplingMap.get(cls.id)?.size ?? 0;
    const dit = computeDit(cls.id);
    const noc = childrenMap.get(cls.id)?.length ?? 0;
    const attributeCount = cls.attributes?.length ?? 0;
    const operationCount = cls.operations?.length ?? 0;

    // God Class heuristic: high attribute count + high method count or extreme CBO
    const isGodClass = (attributeCount >= 8 && operationCount >= 4) || attributeCount >= 10 || cbo >= 6;

    // Per-class score calculation
    let score = 100;
    if (cbo > 4) score -= (cbo - 4) * 12;
    if (dit > 2) score -= (dit - 2) * 15;
    if (isGodClass) score -= 30;
    if (attributeCount === 0 && (cls.stereotype !== 'interface' && cls.stereotype !== 'enum')) {
      score -= 10; // Empty entity without attributes
    }

    score = Math.max(10, Math.min(100, Math.round(score)));

    let health: 'good' | 'warning' | 'danger' = 'good';
    if (score < 60) health = 'danger';
    else if (score < 80) health = 'warning';

    return {
      classId: cls.id,
      className: cls.name,
      cbo,
      dit,
      noc,
      attributeCount,
      operationCount,
      isGodClass,
      health,
      healthScore: score,
    };
  });

  // 4. Summaries
  const totalCbo = classMetrics.reduce((sum, m) => sum + m.cbo, 0);
  const averageCbo = Number((totalCbo / classes.length).toFixed(1));
  const maxDit = Math.max(0, ...classMetrics.map((m) => m.dit));
  const godClassesCount = classMetrics.filter((m) => m.isGodClass).length;

  // Global score
  const avgClassScore = classMetrics.reduce((sum, m) => sum + m.healthScore, 0) / classMetrics.length;
  const overallScore = Math.max(10, Math.min(100, Math.round(avgClassScore)));

  // 5. Automated architectural recommendations (SOLID / Design Patterns)
  const recommendations: string[] = [];

  const highCboClasses = classMetrics.filter((m) => m.cbo >= 5);
  if (highCboClasses.length > 0) {
    recommendations.push(
      `Alto Acoplamiento (CBO): ${highCboClasses.map((c) => c.className).join(', ')} tienen 5 o más dependencias. Considera aplicar el Patrón Façade o desacoplar mediante interfaces.`,
    );
  }

  const godClasses = classMetrics.filter((m) => m.isGodClass);
  if (godClasses.length > 0) {
    recommendations.push(
      `Violación de Principio SRP (God Class): ${godClasses.map((c) => c.className).join(', ')} acumulan demasiadas responsabilidades o atributos. Evalúa dividir en clases de detalle o Value Objects.`,
    );
  }

  if (maxDit >= 3) {
    recommendations.push(
      `Jerarquía de Herencia Profunda (DIT ≥ 3): Se detectó una jerarquía de herencia de más de 2 niveles. En diseño moderno se recomienda "Composición sobre Herencia" para evitar fragilidad.`,
    );
  }

  const emptyClasses = classMetrics.filter((m) => m.attributeCount === 0);
  if (emptyClasses.length > 0) {
    recommendations.push(
      `Clases sin atributos: ${emptyClasses.map((c) => c.className).join(', ')} no tienen atributos definidos. Verifica si requieren campos antes de generar la base de datos.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      '¡Excelente diseño arquitectónico! Las clases mantienen bajo acoplamiento (CBO), cohesión adecuada y jerarquías controladas conformes a los principios SOLID.',
    );
  }

  return {
    overallScore,
    totalClasses: classes.length,
    averageCbo,
    maxDit,
    godClassesCount,
    classMetrics,
    recommendations,
  };
}
