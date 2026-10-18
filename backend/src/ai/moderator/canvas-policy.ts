import type { RelationType } from '../../diagrams/uml.types.js';
import type { DiagramOperation } from '../operations.types.js';
import { isExplicitChangeRequest } from './intent.js';

export interface CanvasPolicyResult {
  operations: DiagramOperation[];
  reason?: 'SUGGESTIONS_ONLY' | 'NOT_REQUESTED';
  /** Builds the reply to send instead of the model's, which may claim changes that were not applied. */
  rewriteReply?: (modelReply: string, askerName: string) => string;
}

/**
 * Decides which of the model's canvas operations the room actually gets.
 * Enforced on the server, never trusted to the model:
 *   1. Room setting: with "solo sugerencias" the AI never edits the canvas;
 *      its proposed operations become steps the team can apply by hand.
 *   2. Intent: even when allowed, only an explicit request changes the canvas.
 */
export function applyCanvasPolicy(
  operations: DiagramOperation[],
  message: string,
  canEditCanvas: boolean,
): CanvasPolicyResult {
  if (!canEditCanvas && !operations.length && isExplicitChangeRequest(message)) {
    // The model proposed nothing structured but may still claim "agregué X": say up front that nothing changed.
    return {
      operations: [],
      reason: 'SUGGESTIONS_ONLY',
      rewriteReply: (modelReply, askerName) =>
        `${firstName(askerName)}, la sala está en modo «solo sugerencias»: no modifiqué el lienzo. ` +
        `Mi propuesta: ${stripName(modelReply, askerName)}`,
    };
  }
  if (!operations.length) return { operations };
  if (!canEditCanvas) {
    const steps = operations.map(describeOperation).filter((s): s is string => !!s);
    return {
      operations: [],
      reason: 'SUGGESTIONS_ONLY',
      // Small models often answer "agregué X" anyway: the server writes the reply from the operations.
      rewriteReply: (_modelReply, askerName) =>
        `${firstName(askerName)}, la sala está en modo «solo sugerencias», así que no modifiqué el lienzo. ` +
        `Para hacerlo a mano:\n${steps.map((s) => `• ${s}`).join('\n')}\n` +
        'O activa «IA edita el lienzo» en el chat del equipo y pídemelo de nuevo.',
    };
  }
  if (!isExplicitChangeRequest(message)) {
    return {
      operations: [],
      reason: 'NOT_REQUESTED',
      rewriteReply: (modelReply) =>
        `${modelReply}\n\n(No apliqué cambios en el lienzo porque el mensaje no los pide explícitamente. ` +
        'Si quieres que los haga, respóndeme «sí, hazlo» o pídemelo con «agrega…», «renombra…», «relaciona…».)',
    };
  }
  return { operations };
}

const RELATION_NAMES: Record<RelationType, string> = {
  ASSOCIATION: 'asociación',
  AGGREGATION: 'agregación',
  COMPOSITION: 'composición',
  INHERITANCE: 'herencia',
  ONE_TO_ONE: '1 : 1',
  ONE_TO_MANY: '1 : N',
  MANY_TO_ONE: 'N : 1',
  MANY_TO_MANY: 'N : M',
  DEPENDENCY: 'dependencia',
};

/** One operation as a step a person can follow on the canvas. */
export function describeOperation(op: DiagramOperation): string | undefined {
  switch (op.op) {
    case 'CREATE_CLASS': {
      const attrs = (op.attributes ?? []).map((a) => `${a.name}: ${a.type}`).join(', ');
      return `Crear la clase ${op.name}${attrs ? ` (${attrs})` : ''}`;
    }
    case 'DELETE_CLASS':
      return `Eliminar la clase ${op.className}`;
    case 'RENAME_CLASS':
      return `Renombrar ${op.className} a ${op.newName}`;
    case 'ADD_ATTRIBUTE':
      return `Agregar a ${op.className} el atributo ${op.attribute.name}: ${op.attribute.type}`;
    case 'REMOVE_ATTRIBUTE':
      return `Quitar de ${op.className} el atributo ${op.attributeName}`;
    case 'CREATE_RELATION':
      return `Relacionar ${op.sourceClassName} → ${op.targetClassName} (${RELATION_NAMES[op.type] ?? op.type})`;
    case 'DELETE_RELATION':
      return `Eliminar la relación ${op.sourceClassName} → ${op.targetClassName}`;
    case 'AUTO_LAYOUT':
      return 'Ordenar el diagrama (Diseño & Calidad → ordenar)';
  }
}

/** "Fernando Angulo, agregué…" → "agregué…" (the rewritten reply already starts with the name). */
function stripName(reply: string, askerName: string): string {
  const trimmed = reply.trim();
  const comma = trimmed.indexOf(',');
  const opening = comma > 0 ? trimmed.slice(0, comma).toLowerCase() : '';
  return opening.startsWith(firstName(askerName).toLowerCase()) ? trimmed.slice(comma + 1).trim() : trimmed;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
