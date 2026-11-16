import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { ErroApp } from '@/lib/erroApp';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * Sincronização dos assistidos com a Tita (E28). A Edge Function `sincronizar-tita` busca a lista
 * de favorecidos na Tita (o token fica só no servidor), e o banco casa cada um com o cadastro, cria
 * os rascunhos e guarda as pendências. A tela lê a última sincronização e as pendências, liga as
 * unidades novas da Tita e pede a sincronização: primeiro simulada, para conferir os números.
 * Só a coordenação geral lê e sincroniza (RLS e a própria função).
 */
export const TIPOS_DE_PENDENCIA = [
  'unidade_desconhecida',
  'sem_unidade',
  'varias_unidades',
  'outra_unidade',
  'nome_incompleto',
  'data_invalida',
  'sem_genero',
  'possivel_duplicado',
  'inativo_na_tita',
  'fora_da_tita',
  'sem_id',
  'erro',
] as const;

export type TipoDePendencia = (typeof TIPOS_DE_PENDENCIA)[number];

/** Os números de uma sincronização (ou da simulação). */
export interface ResumoDaSincronizacao {
  recebidos: number;
  criados: number;
  ligados: number;
  atualizados: number;
  ignorados: number;
  pendencias: number;
}

export interface Sincronizacao {
  feitaEm: string;
  origem: 'manual' | 'agendada';
  /** Nulo quando a tentativa falhou. */
  resumo: ResumoDaSincronizacao | null;
  erro: string | null;
}

export interface PendenciaDaTita {
  id: number;
  tipo: TipoDePendencia;
  titaId: number | null;
  assistidoId: number | null;
  nome: string | null;
  detalhe: string | null;
  quantidade: number | null;
}

const esquemaResumo = z
  .object({
    recebidos: z.number(),
    criados: z.number(),
    ligados: z.number(),
    atualizados: z.number(),
    ignorados: z.number(),
    pendencias: z.number(),
  })
  .transform((resumo): ResumoDaSincronizacao => ({
    recebidos: resumo.recebidos,
    criados: resumo.criados,
    ligados: resumo.ligados,
    atualizados: resumo.atualizados,
    ignorados: resumo.ignorados,
    pendencias: resumo.pendencias,
  }));

const esquemaSincronizacao = z
  .object({
    feita_em: z.string(),
    origem: z.enum(['manual', 'agendada']),
    resumo: esquemaResumo.nullable(),
    erro: z.string().nullable(),
  })
  .transform((linha): Sincronizacao => ({
    feitaEm: linha.feita_em,
    origem: linha.origem,
    resumo: linha.resumo,
    erro: linha.erro,
  }));

const esquemaPendencia = z
  .object({
    id: z.number().int(),
    tipo: z.enum(TIPOS_DE_PENDENCIA),
    tita_id: z.number().int().nullable(),
    assistido_id: z.number().int().nullable(),
    nome: z.string().nullable(),
    detalhe: z.string().nullable(),
    quantidade: z.number().int().nullable(),
  })
  .transform((linha): PendenciaDaTita => ({
    id: linha.id,
    tipo: linha.tipo,
    titaId: linha.tita_id,
    assistidoId: linha.assistido_id,
    nome: linha.nome,
    detalhe: linha.detalhe,
    quantidade: linha.quantidade,
  }));

const MENSAGENS = {
  sem_permissao: 'Só a coordenação geral cuida da sincronização com a Tita.',
  duplicado: 'Esta unidade da Tita já está ligada.',
};

/** A última sincronização (ou tentativa), ou nulo se nunca houve. */
export async function buscarUltimaSincronizacao(): Promise<Sincronizacao | null> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from('sincronizacoes_da_tita')
    .select('feita_em, origem, resumo, erro')
    .order('feita_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return esquemaSincronizacao.nullable().parse(data);
}

/** O que precisa de ação desde a última sincronização. */
export async function buscarPendenciasDaTita(): Promise<PendenciaDaTita[]> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from('pendencias_da_tita')
    .select('id, tipo, tita_id, assistido_id, nome, detalhe, quantidade')
    .order('id');
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return z.array(esquemaPendencia).parse(data);
}

/** Liga o nome que a Tita usa a uma unidade; `null`: a unidade não entra (como a matriz). */
export async function ligarUnidadeDaTita(nomeNaTita: string, unidadeId: number | null) {
  const { error } = await supabase
    .schema('cadastro')
    .from('unidades_da_tita')
    .insert({ nome_na_tita: nomeNaTita, unidade_id: unidadeId });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}

const esquemaDaRecusa = z.object({ codigo: z.string(), mensagem: z.string() });

const INDISPONIVEL = 'Não foi possível sincronizar agora. Tente de novo em instantes.';

/** Pede a sincronização; com `simular`, só os números, sem gravar nada. */
export async function sincronizarComATita(simular: boolean): Promise<ResumoDaSincronizacao> {
  const resposta = await supabase.functions.invoke<unknown>('sincronizar-tita', {
    body: { simular },
  });
  const erro: unknown = resposta.error;
  if (erro === null) {
    const resumo = esquemaResumo.safeParse(resposta.data);
    if (resumo.success) return resumo.data;
    throw new ErroApp('indisponivel', INDISPONIVEL, resumo.error);
  }
  if (erro instanceof FunctionsHttpError && erro.context instanceof Response) {
    const corpo: unknown = await erro.context.json().catch(() => null);
    const recusa = esquemaDaRecusa.safeParse(corpo);
    if (recusa.success) throw new ErroApp(recusa.data.codigo, recusa.data.mensagem, erro);
  }
  throw new ErroApp('indisponivel', INDISPONIVEL, erro);
}
