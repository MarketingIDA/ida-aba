import { describe, expect, it } from 'vitest';

import { esquemaPlano, esquemaUnidade } from '@/features/cadastros/esquemas';

const unidade = (sigla: string, nome = 'Unidade Fictícia') =>
  esquemaUnidade.safeParse({ sigla, nome, ativa: true });

describe('esquema da unidade', () => {
  it('tira os espaços e põe a sigla em maiúsculas', () => {
    expect(unidade(' bov ', '  Boa Viagem Fictícia ').data).toEqual({
      sigla: 'BOV',
      nome: 'Boa Viagem Fictícia',
      ativa: true,
    });
  });

  it.each(['B', 'BÔV', 'BOV1', 'ABCDEF', 'B-V'])('recusa a sigla "%s"', (sigla) => {
    const resultado = unidade(sigla);
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(
      'Use de 2 a 5 letras, sem acento e sem número (ex.: BOV).',
    );
  });

  it('pede o nome com 2 letras ou mais e até 80', () => {
    expect(unidade('BOV', ' A ').error?.issues[0]?.message).toBe(
      'Escreva o nome da unidade, com 2 letras ou mais.',
    );
    expect(unidade('BOV', 'A'.repeat(81)).error?.issues[0]?.message).toBe(
      'O nome da unidade pode ter até 80 letras.',
    );
  });
});

describe('esquema do plano', () => {
  it('tira os espaços do nome e pede 2 letras ou mais', () => {
    expect(esquemaPlano.parse({ nome: ' Plano Fictício ', ativo: false })).toEqual({
      nome: 'Plano Fictício',
      ativo: false,
    });
    expect(esquemaPlano.safeParse({ nome: '', ativo: true }).error?.issues[0]?.message).toBe(
      'Escreva o nome do plano, com 2 letras ou mais.',
    );
  });
});
