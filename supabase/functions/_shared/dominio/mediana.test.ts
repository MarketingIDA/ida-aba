import { describe, expect, it } from 'vitest';

import { mediana, medianaDaCarteira } from './mediana.ts';

describe('mediana da carteira (E27)', () => {
  it('conta cada assistido lido, o sem meta independente como zero, semana a semana', () => {
    expect([mediana([]), mediana([3, 1, 2]), mediana([4, 1, 3, 0])]).toEqual([0, 2, 2]);
    const m = medianaDaCarteira(
      [
        { assistido: 1, independenteEm: '2026-08-04' },
        { assistido: 1, independenteEm: '2026-08-12' },
        { assistido: 2, independenteEm: '2026-08-11' },
        { assistido: 3, independenteEm: null },
        { assistido: 4, independenteEm: '2026-08-05' },
      ],
      '2026-08-01',
      '2026-08-17',
    );
    // Semanas de 27/07, 03/08, 10/08 e 17/08: [0,0,0,0], [1,0,0,1], [2,1,0,1], [2,1,0,1].
    expect(m).toEqual({ assistidos: 4, porSemana: [0, 0.5, 1, 1] });
  });
});
