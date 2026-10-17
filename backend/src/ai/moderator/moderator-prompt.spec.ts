import { describe, expect, it } from 'vitest';
import { buildModeratorPrompt, ensureAddressed, type ModeratorContext } from './moderator-prompt.js';

const marco = { userId: 'u1', userName: 'Marco', timestamp: '2026-10-20T14:15:00.000Z' };
const luis = { userId: 'u2', userName: 'Luis', timestamp: '2026-10-20T14:16:00.000Z' };

function context(): ModeratorContext {
  return {
    askerName: 'Trevor',
    diagramName: 'Sistema de Ventas',
    model: {
      classes: [
        {
          id: 'c1',
          name: 'Pedido',
          author: marco,
          lastModifiedBy: luis,
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true, author: marco },
            { name: 'total', type: 'Double', visibility: 'private', author: luis },
          ],
        },
        { id: 'c2', name: 'Cliente', attributes: [] },
      ],
      relations: [{ id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c2', targetClassId: 'c1' }],
    },
    participants: ['Trevor', 'Marco'],
    recentActivity: [
      { userName: 'Marco', summary: 'Creó la clase Pedido', timestamp: new Date('2026-10-20T14:15:00Z') },
      {
        userName: 'Luis',
        summary: 'Agregó el atributo total: Double a Pedido',
        timestamp: new Date('2026-10-20T14:16:00Z'),
      },
    ],
    askerThread: [
      {
        senderName: 'Trevor',
        isAi: false,
        text: '¿Qué es una composición?',
        timestamp: new Date('2026-10-20T14:10:00Z'),
      },
      {
        senderName: 'Moderador IA',
        isAi: true,
        addressedTo: 'Trevor',
        text: 'Trevor, una composición es...',
        timestamp: new Date('2026-10-20T14:10:05Z'),
      },
    ],
    roomChat: [],
  };
}

describe('buildModeratorPrompt', () => {
  const prompt = buildModeratorPrompt(context());

  it('tells the AI who is asking and to address them by name', () => {
    expect(prompt).toContain('Quien te pregunta ahora es: Trevor.');
    expect(prompt).toContain('"Trevor, aquí tu respuesta: ...".');
    expect(prompt).toContain('{ "reply": "Trevor, ...", "operations": [] }');
  });

  it('includes the group context: diagram state with authorship and the activity log', () => {
    expect(prompt).toContain(
      '- Pedido — creada por Marco, última edición de Luis: id: Long PK, total: Double (por Luis)',
    );
    expect(prompt).toContain('- Cliente → Pedido: ONE_TO_MANY');
    // Times are shown in Bolivia's time zone (UTC-4).
    expect(prompt).toContain('- 10:15 Marco: Creó la clase Pedido');
    expect(prompt).toContain('Conectados ahora: Trevor, Marco');
  });

  it('includes the individual thread of the asker', () => {
    expect(prompt).toContain('## Hilo individual de Trevor');
    expect(prompt).toContain('- 10:10 Trevor: ¿Qué es una composición?');
    expect(prompt).toContain('- 10:10 IA → Trevor: Trevor, una composición es...');
  });

  it('only allows canvas changes on explicit request', () => {
    expect(prompt).toContain('SOLO si Trevor pide explícitamente cambiar el diagrama');
  });
});

describe('ensureAddressed', () => {
  it('keeps replies that already name the user', () => {
    expect(ensureAddressed('Trevor, aquí tu respuesta.', 'Trevor')).toBe('Trevor, aquí tu respuesta.');
    expect(ensureAddressed('¡Claro, Marco! Un atributo derivado...', 'Marco Pérez')).toBe(
      '¡Claro, Marco! Un atributo derivado...',
    );
  });

  it('prefixes the first name when the model forgot it', () => {
    expect(ensureAddressed('Un atributo derivado se calcula.', 'Marco Pérez')).toBe(
      'Marco, Un atributo derivado se calcula.',
    );
  });
});
