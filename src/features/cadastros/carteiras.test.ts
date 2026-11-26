import { describe, expect, it } from 'vitest';

import type { Carteira } from '@/features/cadastros/api/carteiras.api';
import { planoDeAtribuicao } from '@/features/cadastros/carteiras';

const carteira = (
  id: number,
  turno: Carteira['turno'],
  coordenadorId: number | null,
): Carteira => ({
  id,
  unidadeId: 1,
  turno,
  coordenadorId,
  ativa: true,
});

describe('atribuição das carteiras de quem coordena', () => {
  it('preenche a carteira vazia, divide a que já tem alguém e solta a que não quer mais', () => {
    const carteiras = [
      carteira(1, 'manha', null),
      carteira(2, 'tarde', 7),
      carteira(3, 'integral', 5),
      carteira(4, 'integral', 7),
    ];
    // A pessoa 5 tinha a integral (com a 7 ao lado) e passa a ter manhã e tarde.
    expect(planoDeAtribuicao(carteiras, 5, ['1:manha', '1:tarde'])).toEqual([
      { tipo: 'alterar', id: 3, valores: { coordenadorId: 5, ativa: false } },
      { tipo: 'alterar', id: 1, valores: { coordenadorId: 5, ativa: true } },
      { tipo: 'cadastrar', valores: { unidadeId: 1, turno: 'tarde', coordenadorId: 5 } },
    ]);
    // Sozinha na carteira, a 7 sai e a carteira segue, sem coordenador.
    expect(planoDeAtribuicao(carteiras, 7, ['1:integral'])).toEqual([
      { tipo: 'alterar', id: 2, valores: { coordenadorId: null, ativa: true } },
    ]);
  });
});
