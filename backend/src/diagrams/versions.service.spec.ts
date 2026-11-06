import { describe, expect, it } from 'vitest';
import { extendsLastVersion, VERSION_MERGE_WINDOW_MS, type NewVersion } from './versions.service.js';

const luis = { userId: 'u1', userName: 'Luis', type: 'USER' as const };
const eli = { userId: 'u2', userName: 'Elizabeth', type: 'USER' as const };
const now = new Date('2026-11-06T10:00:00Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const next = (over: Partial<NewVersion> = {}): NewVersion => ({
  diagramId: 'd1',
  name: 'Tienda',
  model: { classes: [], relations: [] },
  author: luis,
  source: 'MANUAL',
  changesCount: 1,
  summary: 'Creó la clase Pedido',
  ...over,
});

describe('extendsLastVersion — una versión por "sesión de edición"', () => {
  it('el autoguardado de la misma persona, minutos después, extiende la última versión', () => {
    expect(extendsLastVersion({ author: luis, source: 'MANUAL', updatedAt: minutesAgo(2) }, next(), now)).toBe(true);
  });

  it('otra persona abre una versión nueva', () => {
    expect(extendsLastVersion({ author: eli, source: 'MANUAL', updatedAt: minutesAgo(1) }, next(), now)).toBe(false);
  });

  it('un cambio aplicado por la IA es su propia versión', () => {
    expect(extendsLastVersion({ author: luis, source: 'MANUAL', updatedAt: minutesAgo(1) }, next({ source: 'AI' }), now)).toBe(false);
  });

  it('pasada la ventana de tiempo empieza una versión nueva', () => {
    const old = new Date(now.getTime() - VERSION_MERGE_WINDOW_MS - 1);
    expect(extendsLastVersion({ author: luis, source: 'MANUAL', updatedAt: old }, next(), now)).toBe(false);
  });

  it('una restauración siempre es una versión nueva, y nada se mezcla con ella', () => {
    expect(extendsLastVersion({ author: luis, source: 'MANUAL', updatedAt: minutesAgo(1) }, next({ restoredFrom: 3 }), now)).toBe(false);
    expect(
      extendsLastVersion({ author: luis, source: 'MANUAL', updatedAt: minutesAgo(1), restoredFrom: 3 }, next(), now),
    ).toBe(false);
  });

  it('la primera versión del diagrama no extiende nada', () => {
    expect(extendsLastVersion(null, next(), now)).toBe(false);
  });
});
