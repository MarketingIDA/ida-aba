import { describe, expect, it } from 'vitest';

import { citaFrequencia, frequenciaDoPeriodo } from './frequencia.ts';

describe('frequência do período (E04)', () => {
  it('conta a falta fora das sessões e reconhece a citação no texto', () => {
    expect(frequenciaDoPeriodo([])).toBeNull();
    expect(
      frequenciaDoPeriodo([{ falta: false }, { falta: true }, { falta: false }, { falta: true }]),
    ).toBe(50);
    expect(citaFrequencia('A Frequência foi baixa.', 50)).toBe(true);
    expect(citaFrequencia('Compareceu a 50% das sessões.', 50)).toBe(true);
    expect(citaFrequencia('Compareceu a 50 % das sessões.', 50)).toBe(true);
    expect(citaFrequencia('Compareceu a 150% do previsto.', 50)).toBe(false);
    expect(citaFrequencia('Participou bem.', 50)).toBe(false);
  });
});
