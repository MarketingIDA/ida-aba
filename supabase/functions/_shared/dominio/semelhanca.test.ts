import { describe, expect, it } from 'vitest';

import { semelhanca } from './semelhanca.ts';

describe('semelhança com o mês anterior (P7)', () => {
  it('mede as sequências de palavras repetidas, sem acento nem pontuação', () => {
    const anterior = 'A assistida participou das sessões com dica verbal e pareou figuras.';
    expect(
      semelhanca('A ASSISTIDA participou, das sessoes com dica verbal e pareou figuras', anterior),
    ).toBe(100);
    expect(semelhanca('O assistido nomeou cores sem ajuda durante todo o mês.', anterior)).toBe(0);
    expect(
      semelhanca('A assistida participou das sessões com outra estratégia nova.', anterior),
    ).toBe(50);
    expect(semelhanca('Curto.', anterior)).toBe(0);
  });
});
