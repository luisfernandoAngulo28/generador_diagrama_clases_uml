import type { UmlModel } from '../diagrams/uml.types.js';
import type { DiagramOperation, EditDiagramResult } from './operations.types.js';

/**
 * Safety net applied to EVERY provider's output (Gemini included): drops
 * any operation that references a class name that does not exist in the
 * current model AND was not created earlier in this same batch. This is
 * what protects against a model inventing a relation to a class nobody
 * asked for (a real failure observed with small local models — see
 * docs/Plan-B-Local.md) — without this, the frontend would apply it
 * blindly since operations are executed client-side with no other check.
 */
export function validateOperations(result: EditDiagramResult, model: UmlModel): EditDiagramResult {
  const known = new Set(model.classes.map((c) => c.name));
  const dropped: string[] = [];
  const kept: DiagramOperation[] = [];

  const knowsClass = (name: string) => known.has(name);

  for (const op of result.operations) {
    switch (op.op) {
      case 'CREATE_CLASS':
        known.add(op.name);
        kept.push(op);
        break;
      case 'DELETE_CLASS':
      case 'RENAME_CLASS':
      case 'ADD_ATTRIBUTE':
      case 'REMOVE_ATTRIBUTE':
        if (knowsClass(op.className)) {
          kept.push(op);
        } else {
          dropped.push(`${op.op} sobre "${op.className}" (esa clase no existe)`);
        }
        break;
      case 'CREATE_RELATION':
      case 'DELETE_RELATION':
        if (knowsClass(op.sourceClassName) && knowsClass(op.targetClassName)) {
          kept.push(op);
        } else {
          dropped.push(
            `${op.op} entre "${op.sourceClassName}" y "${op.targetClassName}" (alguna de las dos clases no existe)`,
          );
        }
        break;
      case 'AUTO_LAYOUT':
        kept.push(op);
        break;
    }
  }

  if (dropped.length === 0) {
    return result;
  }

  const warning = `\n\n(Se descartaron ${dropped.length} operación(es) inválida(s) propuestas por el modelo: ${dropped.join('; ')}.)`;
  return { reply: `${result.reply}${warning}`, operations: kept };
}
