import { describe, expect, it } from 'vitest';

import { tratamentoDe, trocarNome } from './pseudonimo.ts';

describe('troca do nome antes da IA (E05)', () => {
  it('troca o nome completo e o primeiro nome, sem diferenciar maiúsculas, acentos nem espaços', () => {
    const texto =
      'João Pedro da Silva chegou bem. JOAO seguiu a rotina; joão pediu o brinquedo. A mãe de João  Pedro  da  Silva avisou.';
    expect(trocarNome(texto, ' João Pedro  da Silva ', 'masculino')).toEqual({
      texto:
        'o assistido chegou bem. o assistido seguiu a rotina; o assistido pediu o brinquedo. A mãe de o assistido avisou.',
      trocas: 4,
    });
  });

  it('usa o tratamento do gênero e não troca pedaço de outra palavra', () => {
    expect(tratamentoDe('feminino')).toBe('a assistida');
    expect(trocarNome('Ana brincou com a Mariana e com Ana-Lu.', 'Ana Souza', 'feminino')).toEqual({
      texto: 'a assistida brincou com a Mariana e com a assistida-Lu.',
      trocas: 2,
    });
  });

  it('nome de uma letra só, ou com sinais, não vira padrão que troca o texto todo', () => {
    expect(trocarNome('A sessão foi boa.', 'A', 'feminino')).toEqual({
      texto: 'A sessão foi boa.',
      trocas: 0,
    });
    expect(trocarNome("D'Ávila (Lu) sorriu.", "D'Ávila (Lu)", 'feminino').trocas).toBe(1);
  });
});
