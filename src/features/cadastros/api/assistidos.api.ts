import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * Assistidos (`cadastro.assistidos`). A coordenação geral lê todos, cadastra e altera; o
 * coordenador lê só os da própria carteira (RLS). O banco dá o número do assistido na unidade
 * (código da evolução) e o refaz quando ele muda de unidade.
 */
export const GENEROS = ['feminino', 'masculino'] as const;

export type Genero = (typeof GENEROS)[number];

export interface Assistido {
  id: number;
  nome: string;
  /**
   * Como o texto da evolução se refere: "a assistida" ou "o assistido". Nulo só no rascunho que
   * veio da Tita com sexo "Outros": a coordenação geral escolhe ao pôr na carteira.
   */
  genero: Genero | null;
  /** `AAAA-MM-DD`, ou nulo enquanto não se sabe. */
  dataNascimento: string | null;
  /** Sem plano, a evolução do mês fica bloqueada até o plano entrar. */
  planoId: number | null;
  unidadeId: number;
  /** Nulo: rascunho vindo da Tita, à espera da carteira (a Tita não diz o turno). */
  carteiraId: number | null;
  ativo: boolean;
}

/** O que se grava: a unidade vem sempre da carteira escolhida (a chave estrangeira é composta). */
export type DadosDoAssistido = Omit<Assistido, 'id'>;

const COLUNAS = 'id, nome, genero, data_nascimento, plano_id, unidade_id, carteira_id, ativo';

const esquemaAssistido = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    genero: z.enum(GENEROS).nullable(),
    data_nascimento: z.string().nullable(),
    plano_id: z.number().int().nullable(),
    unidade_id: z.number().int(),
    carteira_id: z.number().int().nullable(),
    ativo: z.boolean(),
  })
  .transform((linha): Assistido => ({
    id: linha.id,
    nome: linha.nome,
    genero: linha.genero,
    dataNascimento: linha.data_nascimento,
    planoId: linha.plano_id,
    unidadeId: linha.unidade_id,
    carteiraId: linha.carteira_id,
    ativo: linha.ativo,
  }));

const MENSAGENS = {
  // Os `check` do banco: o nome sem sobrenome ou a data fora da faixa (o formulário confere antes).
  regra_violada: 'Confira o nome completo, com sobrenome, e a data de nascimento.',
  sem_permissao: 'Só a coordenação geral cadastra e altera assistidos.',
  regras: {
    carteira_desativada: 'A carteira escolhida está desativada. Escolha uma carteira ativa.',
    carteira_obrigatoria: 'O assistido com carteira não volta a ser rascunho.',
  },
};

const linhaDo = (dados: DadosDoAssistido) => ({
  nome: dados.nome,
  genero: dados.genero,
  data_nascimento: dados.dataNascimento,
  plano_id: dados.planoId,
  unidade_id: dados.unidadeId,
  carteira_id: dados.carteiraId,
  ativo: dados.ativo,
});

export async function buscarAssistidos(): Promise<Assistido[]> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from('assistidos')
    .select(COLUNAS)
    .order('nome');
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return z.array(esquemaAssistido).parse(data);
}

/** Cadastra (sem `id`) ou altera (com `id`); devolve o assistido como ficou no banco. */
export async function salvarAssistido(dados: DadosDoAssistido, id?: number): Promise<Assistido> {
  const de = supabase.schema('cadastro').from('assistidos');
  const linha = linhaDo(dados);
  const escrita = id === undefined ? de.insert(linha) : de.update(linha).eq('id', id);
  const { data, error } = await escrita.select(COLUNAS).single();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return esquemaAssistido.parse(data);
}
