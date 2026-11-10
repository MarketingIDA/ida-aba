import { describe, expect, it } from 'vitest';

import type { Carteira } from '@/features/cadastros/api/carteiras.api';
import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import {
  itemDaCarteira,
  montarCarteiras,
  opcoesDeCoordenacao,
  opcoesDeTurno,
  opcoesDeUnidade,
  turnosOcupados,
} from '@/features/cadastros/carteiras';
import { carteirasDemo, pessoasDemo, unidadesDoCadastroDemo } from '@/testing/factories/cadastros';

const pessoas = (): Pessoa[] =>
  pessoasDemo().map(({ auth_user_id: conta, ...pessoa }) => ({
    ...pessoa,
    temConta: conta !== null,
  }));

const carteiras = (): Carteira[] =>
  carteirasDemo().map(({ unidade_id: unidadeId, coordenador_id: coordenadorId, ...resto }) => ({
    ...resto,
    unidadeId,
    coordenadorId,
  }));

const montadas = () => montarCarteiras(carteiras(), unidadesDoCadastroDemo(), pessoas());

/** A carteira montada pelo `id` (falha alto se a factory mudar). */
function carteira(id: number) {
  const achada = montadas().find((c) => c.id === id);
  if (achada === undefined) throw new Error(`Sem a carteira ${String(id)} na factory.`);
  return achada;
}

describe('carteiras na tela', () => {
  it('ficam na ordem da sigla e do turno do dia, com a unidade e quem coordena', () => {
    expect(
      montadas().map((c) => `${c.unidade.sigla} ${c.turno} ${c.coordenador.nome} #${String(c.id)}`),
    ).toEqual([
      'UNA manha Bruno Fictício Novo #3',
      'UNA manha Carla Fictícia Coordenadora #4',
      'UNA tarde Bruno Fictício Novo #1',
      'UNB integral Carla Fictícia Coordenadora #2',
    ]);
  });

  it('sem a unidade ou a pessoa (dado que sumiu), a linha aparece e diz o que falta', () => {
    const [orfa] = montarCarteiras(
      [{ id: 9, unidadeId: 99, turno: 'tarde', coordenadorId: 99, ativa: true }],
      [],
      [],
    );
    expect(orfa).toMatchObject({
      unidade: { sigla: '?', nome: 'Unidade não encontrada' },
      coordenador: { nome: 'Pessoa não encontrada' },
    });
  });

  it('a linha da carteira ativa avisa quando a unidade ou quem coordena foi desativada', () => {
    const manha = carteira(4);
    expect(itemDaCarteira(manha)).toEqual({
      id: 4,
      sigla: 'UNA',
      nome: 'Unidade Fictícia · Manhã',
      detalhe: 'Carla Fictícia Coordenadora',
      marcas: [],
      ativo: true,
      rotuloDaEdicao: 'Editar carteira UNA · Manhã (Carla Fictícia Coordenadora)',
    });
    expect(itemDaCarteira(carteira(2)).marcas).toEqual([
      { rotulo: 'Unidade desativada', tom: 'alerta' },
    ]);
    const semCoordenacao = { ...manha, coordenador: { nome: 'Ex-Coordenação', ativo: false } };
    expect(itemDaCarteira(semCoordenacao).marcas).toEqual([
      { rotulo: 'Coordenação desativada', tom: 'alerta' },
    ]);
  });

  it('a carteira desativada não leva aviso, e o "Editar" dela não se confunde com o da ativa', () => {
    expect(itemDaCarteira(carteira(3))).toMatchObject({
      marcas: [],
      ativo: false,
      rotuloDaEdicao: 'Editar carteira UNA · Manhã (Bruno Fictício Novo, desativada)',
    });
  });
});

describe('escolhas da carteira', () => {
  it('a carteira nova só recebe unidade ativa', () => {
    expect(opcoesDeUnidade(unidadesDoCadastroDemo())).toEqual([
      { valor: '1', rotulo: 'UNA · Unidade Fictícia' },
      { valor: '3', rotulo: 'UNC · Terceira Unidade Fictícia' },
    ]);
  });

  it('coordena quem está ativa e tem o papel de coordenação de unidade', () => {
    expect(opcoesDeCoordenacao(pessoas())).toEqual([
      { valor: '4', rotulo: 'Bruno Fictício Novo' },
      { valor: '2', rotulo: 'Carla Fictícia Coordenadora' },
    ]);
  });

  it('na alteração, quem coordena hoje aparece mesmo desativada ou sem o papel', () => {
    expect(opcoesDeCoordenacao(pessoas(), 3)).toContainEqual({
      valor: '3',
      rotulo: 'Caio Fictício Contas (desativada)',
    });
    expect(opcoesDeCoordenacao(pessoas(), 1)).toContainEqual({
      valor: '1',
      rotulo: 'Gabriela Fictícia Geral (sem o papel de coordenação)',
    });
  });

  it('escolhida a unidade, o turno com carteira ativa diz com quem está e não se escolhe', () => {
    expect(opcoesDeTurno(turnosOcupados(montadas(), 1))).toEqual([
      {
        valor: 'manha',
        rotulo: 'Manhã',
        descricao: 'Já tem carteira ativa, com Carla Fictícia Coordenadora.',
        indisponivel: true,
      },
      {
        valor: 'tarde',
        rotulo: 'Tarde',
        descricao: 'Já tem carteira ativa, com Bruno Fictício Novo.',
        indisponivel: true,
      },
      {
        valor: 'integral',
        rotulo: 'Integral',
        descricao: 'Livre nesta unidade.',
        indisponivel: false,
      },
    ]);
    expect(
      opcoesDeTurno(null).map(({ descricao, indisponivel }) => [descricao, indisponivel]),
    ).toEqual([
      [undefined, false],
      [undefined, false],
      [undefined, false],
    ]);
  });
});
