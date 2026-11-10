import { describe, expect, it } from 'vitest';

import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import { opcoesDeCoordenacao } from '@/features/cadastros/carteiras';
import { pessoasDemo } from '@/testing/factories/cadastros';

const pessoas = (): Pessoa[] =>
  pessoasDemo().map(({ auth_user_id: conta, ...pessoa }) => ({
    ...pessoa,
    temConta: conta !== null,
  }));

describe('escolhas da carteira', () => {
  it('na alteração, quem coordena hoje aparece mesmo desativada ou sem o papel', () => {
    // Sem a opção, o select ficaria em branco ou sugeriria uma troca que ninguém pediu.
    expect(opcoesDeCoordenacao(pessoas())).toEqual([
      { valor: '4', rotulo: 'Bruno Fictício Novo' },
      { valor: '2', rotulo: 'Carla Fictícia Coordenadora' },
    ]);
    expect(opcoesDeCoordenacao(pessoas(), 3)).toContainEqual({
      valor: '3',
      rotulo: 'Caio Fictício Contas (desativada)',
    });
    expect(opcoesDeCoordenacao(pessoas(), 1)).toContainEqual({
      valor: '1',
      rotulo: 'Gabriela Fictícia Geral (sem o papel de coordenação)',
    });
  });
});
