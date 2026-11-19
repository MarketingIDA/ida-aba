import { describe, expect, it } from 'vitest';

import { fontesDasFrases, lerFrases } from './fontes.ts';

describe('fontes de cada frase (E06, E25)', () => {
  it('lê as frases e descarta o que não está no formato', () => {
    expect(
      lerFrases([
        { texto: ' Frase. ', sessoes: [1, 1.5, '2'], documentos: 'D1' },
        { texto: '  ' },
        { texto: 3 },
        null,
      ]),
    ).toEqual([{ texto: 'Frase.', sessoes: [1], documentos: [] }]);
    expect(lerFrases('frase solta')).toBeNull();
  });

  it('troca os números pelas datas e pelos documentos do pedido, sem inventar fonte', () => {
    const frases = [
      {
        campo: 'programas',
        ordem: 0,
        texto: 'Frase.',
        sessoes: [3, 1, 2, 9, 0],
        documentos: [2, 2, 5],
      },
    ];
    expect(fontesDasFrases(frases, ['2026-10-07', '2026-10-05', '2026-10-05'], [40, 41])).toEqual([
      {
        campo: 'programas',
        ordem: 0,
        frase: 'Frase.',
        datas: ['2026-10-05', '2026-10-07'],
        documentos: [41],
      },
    ]);
  });
});
