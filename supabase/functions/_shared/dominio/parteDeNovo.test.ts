import { describe, expect, it } from 'vitest';

import { lerPedidoDaParte, pedidoDaParteDeNovo, textoAtualDaParte } from './parteDeNovo.ts';

const INVALIDO = { valido: false, parte: null };

describe('gerar uma parte de novo (E08)', () => {
  it('lê a parte pedida, recusa o que está fora do formato e monta o pedido à IA', () => {
    expect(lerPedidoDaParte({ evolucao_id: 'x' })).toEqual({ valido: true, parte: null });
    expect(lerPedidoDaParte({ numero: 3, instrucao: '  Metas mais curtas ' })).toEqual({
      valido: true,
      parte: { numero: 3, instrucao: 'Metas mais curtas' },
    });
    expect(lerPedidoDaParte({ numero: 1, instrucao: 'a' })).toEqual(INVALIDO);
    expect(lerPedidoDaParte({ numero: 2, instrucao: 7 })).toEqual(INVALIDO);
    expect(lerPedidoDaParte({ numero: 2, instrucao: '   ' })).toEqual(INVALIDO);
    expect(lerPedidoDaParte({ numero: 2, instrucao: 'a'.repeat(501) })).toEqual(INVALIDO);

    expect(textoAtualDaParte(4, { metas: ['Nomear cores', 'Pedir ajuda'] })).toBe(
      '- Nomear cores\n- Pedir ajuda',
    );
    expect(textoAtualDaParte(3, {})).toBe('');
    expect(textoAtualDaParte(2, null)).toBe('');
    expect(textoAtualDaParte(2, { abertura: 'Participou bem.' })).toContain(
      'abertura: Participou bem.\nprogramas: ',
    );

    const pedido = pedidoDaParteDeNovo({ numero: 4, instrucao: 'Inclua a meta de rotina.' }, '');
    expect(pedido).toContain('Gere de novo só metas_do_mes.');
    expect(pedido).toContain('(vazio)');
    expect(pedido).toContain('Instrução do coordenador: Inclua a meta de rotina.');
    expect(pedidoDaParteDeNovo({ numero: 2, instrucao: 'x' }, 'abertura: a')).toContain(
      'abertura: a',
    );
  });
});
