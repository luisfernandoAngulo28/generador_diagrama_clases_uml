import { describe, expect, it } from 'vitest';
import { applyCanvasPolicy, describeOperation } from './canvas-policy.js';
import type { DiagramOperation } from '../operations.types.js';

const OPS: DiagramOperation[] = [
  {
    op: 'CREATE_CLASS',
    name: 'Reserva',
    attributes: [{ name: 'fecha', type: 'LocalDate', visibility: 'private' }],
  },
  { op: 'CREATE_RELATION', sourceClassName: 'Reserva', targetClassName: 'Mesa', type: 'MANY_TO_ONE' },
];

describe('applyCanvasPolicy', () => {
  it('keeps the operations of an explicit request when the room allows AI edits', () => {
    const result = applyCanvasPolicy(OPS, 'Agrega la clase Reserva', true);
    expect(result.operations).toEqual(OPS);
    expect(result.rewriteReply).toBeUndefined();
  });

  it('in "solo sugerencias" mode drops the operations and turns them into manual steps', () => {
    const result = applyCanvasPolicy(OPS, 'Agrega la clase Reserva', false);
    expect(result.operations).toEqual([]);
    expect(result.reason).toBe('SUGGESTIONS_ONLY');
    // The model's own text ("agregué Reserva…") is replaced: it would claim a change that didn't happen.
    const reply = result.rewriteReply!('Fernando, agregué la clase Reserva.', 'Fernando Angulo');
    expect(reply).toMatch(/^Fernando, la sala está en modo «solo sugerencias»/);
    expect(reply).not.toContain('agregué');
    expect(reply).toContain('• Crear la clase Reserva (fecha: LocalDate)');
    expect(reply).toContain('• Relacionar Reserva → Mesa (N : 1)');
  });

  it('drops operations the user did not ask for and says so after the answer', () => {
    const result = applyCanvasPolicy(OPS, '¿Qué es una reserva?', true);
    expect(result.operations).toEqual([]);
    expect(result.reason).toBe('NOT_REQUESTED');
    expect(result.rewriteReply!('Fernando, una reserva es…', 'Fernando')).toMatch(
      /^Fernando, una reserva es…\n\n\(No apliqué cambios/,
    );
  });

  it('in "solo sugerencias" mode warns up front even if the model proposed no operations', () => {
    const result = applyCanvasPolicy([], 'Agrega la clase Reserva', false);
    expect(result.operations).toEqual([]);
    expect(result.rewriteReply!('Fernando Angulo, agregué la clase Reserva.', 'Fernando Angulo')).toBe(
      'Fernando, la sala está en modo «solo sugerencias»: no modifiqué el lienzo. Mi propuesta: agregué la clase Reserva.',
    );
  });

  it('changes nothing for a plain question without operations', () => {
    expect(applyCanvasPolicy([], '¿Qué es una reserva?', false)).toEqual({ operations: [] });
    expect(applyCanvasPolicy([], 'Agrega la clase Reserva', true)).toEqual({ operations: [] });
  });
});

describe('describeOperation', () => {
  it('describes renames and attribute changes as steps', () => {
    expect(describeOperation({ op: 'RENAME_CLASS', className: 'NuevaClase', newName: 'Cliente' })).toBe(
      'Renombrar NuevaClase a Cliente',
    );
    expect(describeOperation({ op: 'REMOVE_ATTRIBUTE', className: 'Cliente', attributeName: 'email' })).toBe(
      'Quitar de Cliente el atributo email',
    );
  });
});
