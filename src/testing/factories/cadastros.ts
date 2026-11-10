import type { Plano, Unidade } from '@/features/cadastros/api/cadastros.api';
import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import { AUTH_USER_ID_DEMO } from '@/testing/factories/usuario';

/** Unidades fictícias do cadastro, na ordem da Data API (por sigla). Nenhuma é real. */
export function unidadesDoCadastroDemo(): Unidade[] {
  return [
    { id: 1, sigla: 'UNA', nome: 'Unidade Fictícia', ativa: true },
    { id: 2, sigla: 'UNB', nome: 'Outra Unidade Fictícia', ativa: false },
    { id: 3, sigla: 'UNC', nome: 'Terceira Unidade Fictícia', ativa: true },
  ];
}

/** Planos fictícios, na ordem da Data API (por nome). */
export function planosDemo(): Plano[] {
  return [
    { id: 1, nome: 'Plano Fictício', ativo: true },
    { id: 2, nome: 'Plano Fictício Antigo', ativo: false },
  ];
}

/** Linha de `acesso.usuarios` como a Data API devolve: com o id da conta, não com `temConta`. */
export type LinhaDePessoa = Omit<Pessoa, 'temConta'> & { auth_user_id: string | null };

/**
 * Pessoas fictícias, na ordem da Data API (por nome). A de id 1 é a coordenação geral dos testes
 * (`usuarioDemo({ papel: 'coordenacao_geral' })`); a de id 4 ainda não tem conta.
 */
export function pessoasDemo(): LinhaDePessoa[] {
  return [
    {
      id: 4,
      nome: 'Bruno Fictício Novo',
      email: 'novo.demo@evolucao-aba.test',
      papel: 'coordenador',
      crp: null,
      ativo: true,
      auth_user_id: null,
    },
    {
      id: 3,
      nome: 'Caio Fictício Contas',
      email: 'contas.demo@evolucao-aba.test',
      papel: 'contas_medicas',
      crp: null,
      ativo: false,
      auth_user_id: '33333333-3333-4333-8333-333333333333',
    },
    {
      id: 2,
      nome: 'Carla Fictícia Coordenadora',
      email: 'coordenacao.demo@evolucao-aba.test',
      papel: 'coordenador',
      crp: '06/12345',
      ativo: true,
      auth_user_id: '22222222-2222-4222-8222-222222222222',
    },
    {
      id: 1,
      nome: 'Gabriela Fictícia Geral',
      email: 'geral.demo@evolucao-aba.test',
      papel: 'coordenacao_geral',
      crp: null,
      ativo: true,
      auth_user_id: AUTH_USER_ID_DEMO,
    },
  ];
}

/** Linha de `cadastro.carteiras` como a Data API devolve (em snake_case). */
export interface LinhaDeCarteira {
  id: number;
  unidade_id: number;
  turno: 'manha' | 'tarde' | 'integral';
  coordenador_id: number;
  ativa: boolean;
}

/**
 * Carteiras fictícias, na ordem da Data API (por `id`), sobre `unidadesDoCadastroDemo` e
 * `pessoasDemo`. A UNA tem manhã (Carla) e tarde (Bruno) ativas e uma manhã antiga desativada;
 * a UNB, desativada, ainda tem uma carteira ativa. A UNC não tem nenhuma.
 */
export function carteirasDemo(): LinhaDeCarteira[] {
  return [
    { id: 1, unidade_id: 1, turno: 'tarde', coordenador_id: 4, ativa: true },
    { id: 2, unidade_id: 2, turno: 'integral', coordenador_id: 2, ativa: true },
    { id: 3, unidade_id: 1, turno: 'manha', coordenador_id: 4, ativa: false },
    { id: 4, unidade_id: 1, turno: 'manha', coordenador_id: 2, ativa: true },
  ];
}

/** O índice único do banco: uma carteira ativa por unidade e turno. */
export const mesmaVagaAtiva = (existente: LinhaDeCarteira, nova: LinhaDeCarteira) =>
  existente.ativa &&
  nova.ativa &&
  existente.unidade_id === nova.unidade_id &&
  existente.turno === nova.turno;
