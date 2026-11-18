import { describe, expect, it } from 'vitest';

import { conteudoDosNiveis, lerRespostaDosNiveis, montarPedidoDosNiveis } from './niveis.ts';

const METAS = [
  { id: 11, programa: 'Contato visual', texto: 'Manter contato visual por 3 segundos.' },
  { id: 12, programa: 'Imitação motora', texto: 'Imitar 5 movimentos com o corpo.' },
];

const SESSOES = [
  {
    data: '2026-10-05',
    texto: 'A assistida fez contato visual com dica verbal e, depois, com ajuda física parcial.',
  },
  { data: '2026-10-05', texto: 'No contato visual, respondeu com dica gestual.' },
  { data: '2026-10-07', texto: 'Imitou os movimentos, sem registro do apoio.' },
  { data: '2026-10-08', texto: 'Imitou   os movimentos de forma INDEPENDENTE.' },
];

const resposta = (content: unknown) => ({ choices: [{ message: { content } }] });

describe('nível de apoio (E27)', () => {
  it('numera metas e sessões no pedido, sem as datas', () => {
    expect(conteudoDosNiveis(METAS, SESSOES.slice(0, 1))).toBe(
      [
        'Metas:',
        '[meta 1] Contato visual: Manter contato visual por 3 segundos.',
        '[meta 2] Imitação motora: Imitar 5 movimentos com o corpo.',
        '',
        'Análises das sessões:',
        '[sessão 1] A assistida fez contato visual com dica verbal e, depois, com ajuda física parcial.',
      ].join('\n'),
    );
    expect(montarPedidoDosNiveis('modelo-ficticio', METAS, SESSOES).messages).toHaveLength(2);
  });

  it('vale o nível de mais apoio, o trecho tem de estar na análise e o mesmo dia vira um ponto', () => {
    const leituras = [
      // Dois níveis no trecho: vale o de mais apoio (2).
      {
        sessao: 1,
        meta: 1,
        niveis: [4, 2],
        trecho: 'contato visual com dica verbal e, depois, com ajuda física parcial',
      },
      // Mesmo dia, nível 3: o 2 continua valendo.
      { sessao: 2, meta: 1, niveis: [3], trecho: 'respondeu com dica gestual' },
      // Sem nível: trabalhada, fora da escada; e o mesmo dia sem nível não troca nada.
      { sessao: 3, meta: 2, niveis: [], trecho: 'Imitou os movimentos, sem registro do apoio.' },
      { sessao: 3, meta: 2, niveis: [9], trecho: 'sem registro do apoio' },
      // Sem nível e depois com nível no mesmo dia: fica o com nível; espaço e caixa não importam.
      { sessao: 4, meta: 2, niveis: [], trecho: 'imitou os movimentos' },
      { sessao: 4, meta: 2, niveis: [5], trecho: 'Imitou os movimentos de forma independente' },
      // Inventado, fora do formato ou com número que não existe: fica de fora.
      { sessao: 4, meta: 1, niveis: [5], trecho: 'manteve contato visual sozinha' },
      { sessao: 9, meta: 1, niveis: [5], trecho: 'contato visual' },
      { sessao: 1, meta: 3, niveis: [5], trecho: 'contato visual' },
      { sessao: '1', meta: '1', niveis: [5], trecho: 'contato visual' },
      { sessao: 1, meta: 1, niveis: [5], trecho: '   ' },
      { sessao: 1, meta: 1, niveis: 5, trecho: 'contato visual' },
      'texto solto',
    ];
    expect(lerRespostaDosNiveis(resposta(JSON.stringify({ leituras })), METAS, SESSOES)).toEqual([
      {
        metaId: 11,
        data: '2026-10-05',
        nivel: 2,
        trecho: 'contato visual com dica verbal e, depois, com ajuda física parcial',
      },
      {
        metaId: 12,
        data: '2026-10-07',
        nivel: null,
        trecho: 'Imitou os movimentos, sem registro do apoio.',
      },
      {
        metaId: 12,
        data: '2026-10-08',
        nivel: 5,
        trecho: 'Imitou os movimentos de forma independente',
      },
    ]);

    expect(lerRespostaDosNiveis(resposta('{"leituras": 3}'), METAS, SESSOES)).toBeNull();
    expect(lerRespostaDosNiveis(resposta('não é JSON'), METAS, SESSOES)).toBeNull();
    expect(lerRespostaDosNiveis(resposta(null), METAS, SESSOES)).toBeNull();
    expect(lerRespostaDosNiveis({ choices: 'x' }, METAS, SESSOES)).toBeNull();
    expect(lerRespostaDosNiveis({ choices: [7] }, METAS, SESSOES)).toBeNull();
  });
});
