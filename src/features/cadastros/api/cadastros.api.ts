import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * Única camada da feature que fala com o Supabase. Quem pode o quê é o RLS: todo usuário ativo lê
 * unidades e planos; só a coordenação geral cadastra e altera. Nada se apaga: o que não vale mais
 * fica desativado.
 */
export interface Unidade {
  id: number;
  sigla: string;
  nome: string;
  ativa: boolean;
}

export interface Plano {
  id: number;
  nome: string;
  ativo: boolean;
}

type Tabela = 'unidades' | 'planos';
type Mensagens = Parameters<typeof erroDoBanco>[1];

const esquemaUnidade = z.object({
  id: z.number().int(),
  sigla: z.string(),
  nome: z.string(),
  ativa: z.boolean(),
});
const esquemaPlano = z.object({ id: z.number().int(), nome: z.string(), ativo: z.boolean() });

const UNIDADES = {
  tabela: 'unidades',
  colunas: 'id, sigla, nome, ativa',
  mensagens: {
    duplicado: 'Já existe uma unidade com esta sigla.',
    sem_permissao: 'Só a coordenação geral cadastra e altera unidades.',
  },
} as const;

const PLANOS = {
  tabela: 'planos',
  colunas: 'id, nome, ativo',
  mensagens: {
    duplicado: 'Já existe um plano com este nome.',
    sem_permissao: 'Só a coordenação geral cadastra e altera planos.',
  },
} as const;

async function buscarEm(tabela: Tabela, colunas: string, ordem: string): Promise<unknown> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from(tabela)
    .select(colunas)
    .order(ordem);
  if (error !== null) throw erroDoBanco(error);
  return data;
}

/** Cadastra (sem `id`) ou altera (com `id`); devolve a linha como ficou no banco. */
async function salvarEm(
  { tabela, colunas, mensagens }: { tabela: Tabela; colunas: string; mensagens: Mensagens },
  valores: Record<string, string | boolean>,
  id: number | undefined,
): Promise<unknown> {
  const de = supabase.schema('cadastro').from(tabela);
  const escrita = id === undefined ? de.insert(valores) : de.update(valores).eq('id', id);
  const { data, error } = await escrita.select(colunas).single();
  if (error !== null) throw erroDoBanco(error, mensagens);
  return data;
}

export async function buscarUnidades(): Promise<Unidade[]> {
  return z.array(esquemaUnidade).parse(await buscarEm('unidades', UNIDADES.colunas, 'sigla'));
}

export async function salvarUnidade(valores: Omit<Unidade, 'id'>, id?: number): Promise<Unidade> {
  return esquemaUnidade.parse(await salvarEm(UNIDADES, valores, id));
}

export async function buscarPlanos(): Promise<Plano[]> {
  return z.array(esquemaPlano).parse(await buscarEm('planos', PLANOS.colunas, 'nome'));
}

export async function salvarPlano(valores: Omit<Plano, 'id'>, id?: number): Promise<Plano> {
  return esquemaPlano.parse(await salvarEm(PLANOS, valores, id));
}
