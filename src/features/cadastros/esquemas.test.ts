import { describe, expect, it } from 'vitest';

import {
  esquemaAssistido,
  esquemaNovaCarteira,
  esquemaPessoa,
  esquemaPlano,
  esquemaUnidade,
} from '@/features/cadastros/esquemas';

// CNPJ fictício: só os dígitos verificadores batem.
const unidade = (sigla: string, nome = 'Unidade Fictícia', cnpj = '12.345.678/0001-95') =>
  esquemaUnidade.safeParse({ sigla, nome, cnpj, endereco: '  ', ativa: true });

describe('esquema da unidade', () => {
  it('tira os espaços e põe a sigla em maiúsculas', () => {
    expect(unidade(' bov ', '  Boa Viagem Fictícia ').data).toEqual({
      sigla: 'BOV',
      nome: 'Boa Viagem Fictícia',
      cnpj: '12345678000195',
      endereco: null,
      ativa: true,
    });
  });

  it('pede o CNPJ e diz o que conferir, um aviso por vez', () => {
    const aviso = (cnpj: string) => unidade('BOV', 'Unidade Fictícia', cnpj).error?.issues;
    expect(aviso(' ')).toEqual([
      expect.objectContaining({ message: 'Escreva o CNPJ da unidade.' }),
    ]);
    expect(aviso('12.345.678/0001')).toEqual([
      expect.objectContaining({
        message: 'Confira o CNPJ: são 14 números, como 12.345.678/0001-95.',
      }),
    ]);
    expect(aviso('12.345.678/0001-96')).toEqual([
      expect.objectContaining({
        message: 'Confira o CNPJ: os dois últimos números não batem com os outros.',
      }),
    ]);
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

describe('esquema da pessoa', () => {
  const pessoa = (campos: Record<string, unknown>) =>
    esquemaPessoa.safeParse({
      nome: 'Dora Fictícia',
      email: 'dora.demo@evolucao-aba.test',
      papel: 'coordenador',
      crp: '',
      ativo: true,
      ...campos,
    });

  it('limpa o nome, põe o e-mail em minúsculas e manda CRP vazio como nulo', () => {
    expect(
      pessoa({ nome: ' Dora Fictícia ', email: ' Dora.Demo@Evolucao-ABA.test ' }).data,
    ).toEqual({
      nome: 'Dora Fictícia',
      email: 'dora.demo@evolucao-aba.test',
      papel: 'coordenador',
      crp: null,
      ativo: true,
    });
  });

  it('o CRP só vale para a coordenação de unidade', () => {
    expect(pessoa({ crp: ' 06/12345 ' }).data?.crp).toBe('06/12345');
    expect(pessoa({ papel: 'contas_medicas', crp: '06/12345' }).data?.crp).toBeNull();
    // Para os outros papéis, nem o CRP fora da medida trava o cadastro: ele não vai ao banco.
    expect(pessoa({ papel: 'coordenacao_geral', crp: '1' }).success).toBe(true);
    expect(pessoa({ crp: '1' }).error?.issues[0]).toMatchObject({
      path: ['crp'],
      message: 'Escreva o CRP como no carimbo, com 4 a 20 caracteres (ex.: 06/12345).',
    });
  });

  it('pede o papel, o e-mail completo e o nome', () => {
    expect(pessoa({ papel: undefined }).error?.issues[0]?.message).toBe(
      'Escolha o papel da pessoa.',
    );
    expect(pessoa({ email: 'dora@' }).error?.issues[0]?.message).toBe(
      'Escreva o e-mail completo, como nome@clinica.com.br.',
    );
    expect(pessoa({ nome: 'D' }).error?.issues[0]?.message).toBe(
      'Escreva o nome da pessoa, com 2 letras ou mais.',
    );
  });
});

describe('esquemas da carteira', () => {
  it('a opção vazia ("Escolha...") pede a escolha, em vez de virar o id 0', () => {
    const recusa = esquemaNovaCarteira.safeParse({ unidadeId: '', coordenadorId: '' });
    expect(recusa.error?.issues.map(({ path, message }) => ({ path, message }))).toEqual([
      { path: ['unidadeId'], message: 'Escolha a unidade da carteira.' },
      { path: ['turno'], message: 'Escolha o turno da carteira.' },
      { path: ['coordenadorId'], message: 'Escolha quem coordena a carteira.' },
    ]);
  });
});

describe('esquema do assistido', () => {
  const assistido = {
    nome: '  Ana Fictícia  ',
    genero: 'feminino',
    dataNascimento: '',
    planoId: '',
    carteiraId: '4',
    ativo: true,
  };

  it('nascimento e plano vazios viram nulos; a carteira vira o id', () => {
    expect(esquemaAssistido.parse(assistido)).toEqual({
      nome: 'Ana Fictícia',
      genero: 'feminino',
      dataNascimento: null,
      planoId: null,
      carteiraId: 4,
      ativo: true,
    });
  });

  it('pede o sobrenome, a data de 1990 até hoje e a escolha do gênero e da carteira', () => {
    const recusa = esquemaAssistido.safeParse({
      ...assistido,
      nome: 'Ana',
      genero: undefined,
      dataNascimento: '1989-12-31',
      carteiraId: '',
    });
    expect(recusa.error?.issues.map(({ path, message }) => ({ path, message }))).toEqual([
      { path: ['nome'], message: 'Escreva o nome completo, com sobrenome.' },
      { path: ['genero'], message: 'Escolha como o texto se refere: a assistida ou o assistido.' },
      { path: ['dataNascimento'], message: 'Confira a data: de 1990 até hoje.' },
      { path: ['carteiraId'], message: 'Escolha a carteira do assistido.' },
    ]);
  });
});
