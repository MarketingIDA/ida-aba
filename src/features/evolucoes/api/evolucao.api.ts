import { z } from 'zod';

import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';
import { TURNOS } from '@/utils/turno';
import type { Trechos } from '@dominio/evolucao.ts';

/**
 * Uma evolução: criar, ler inteira, gravar as partes, conferir, concluir e reabrir. Quem pode o
 * quê é do banco (grants, RLS e triggers); aqui só se traduzem as recusas.
 */
export type NumeroDaParte = 1 | 2 | 3 | 4;

export interface Versao<T> {
  conteudo: T;
  autor: 'coordenador' | 'ia';
  criadoEm: string;
  criadoPor: string | null;
}

export interface Parte {
  numero: NumeroDaParte;
  conferidaEm: string | null;
  conferidaPor: string | null;
}

const esquemaTrechos = z.object({
  abertura: z.string(),
  programas: z.string(),
  comportamentos: z.string(),
  recursos: z.string(),
  fechamento: z.string(),
});
const esquemaMetas = z.object({ metas: z.array(z.string()) });

const esquemaVersao = z.object({
  numero: z.number().int(),
  conteudo: z.unknown(),
  autor: z.enum(['coordenador', 'ia']),
  criado_em: z.string(),
  criado_por: z.string().nullable(),
});

/** A versão atual da parte, com o conteúdo conferido pelo formato dela; `null` se não há. */
function versaoDa<T>(
  versoes: readonly z.output<typeof esquemaVersao>[],
  numero: 2 | 3 | 4,
  formato: z.ZodType<T>,
): Versao<T> | null {
  const v = versoes.find((x) => x.numero === numero);
  if (v === undefined) return null;
  const conteudo = formato.parse(v.conteudo);
  return { conteudo, autor: v.autor, criadoEm: v.criado_em, criadoPor: v.criado_por };
}

const esquemaEvolucao = z
  .object({
    id: z.string(),
    codigo: z.string(),
    mes_ref: z.string(),
    situacao: z.enum(['em_conferencia', 'concluida', 'enviada']),
    origem: z.enum(['tita', 'manual']),
    concluida_em: z.string().nullable(),
    periodo_inicio: z.string(),
    periodo_fim: z.string(),
    assistido: z.string(),
    plano: z.string().nullable(),
    unidade: z.string(),
    turno: z.enum(TURNOS),
    coordenador: z.string().nullable(),
    editavel: z.boolean(),
    partes: z.array(
      z.object({
        numero: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        conferida_em: z.string().nullable(),
        conferida_por: z.string().nullable(),
      }),
    ),
    versoes: z.array(esquemaVersao),
  })
  .transform((e) => ({
    id: e.id,
    codigo: e.codigo,
    mesRef: e.mes_ref,
    situacao: e.situacao,
    origem: e.origem,
    concluidaEm: e.concluida_em,
    periodo: { inicio: e.periodo_inicio, fim: e.periodo_fim },
    assistido: e.assistido,
    plano: e.plano,
    unidade: e.unidade,
    turno: e.turno,
    coordenador: e.coordenador,
    editavel: e.editavel,
    partes: e.partes.map((p): Parte => ({
      numero: p.numero,
      conferidaEm: p.conferida_em,
      conferidaPor: p.conferida_por,
    })),
    texto: versaoDa(e.versoes, 2, esquemaTrechos),
    metasAlcancadas: versaoDa(e.versoes, 3, esquemaMetas),
    metasDoMes: versaoDa(e.versoes, 4, esquemaMetas),
  }));

export type Evolucao = z.output<typeof esquemaEvolucao>;
export type ConteudoDaParte =
  { numero: 2; conteudo: Trechos } | { numero: 3 | 4; conteudo: { metas: string[] } };

const SEM_PERMISSAO = 'Só o coordenador da carteira altera esta evolução.';

const MENSAGENS: MensagensDoBanco = {
  duplicado: 'Este assistido já tem evolução neste mês. Atualize a lista e abra a que já existe.',
  sem_permissao: SEM_PERMISSAO,
  indisponivel: 'Não foi possível salvar agora. Tente de novo em instantes.',
  regras: {
    assistido_desativado: 'O assistido está desativado no cadastro.',
    evolucao_fechada: 'A evolução não está em conferência. Reabra antes de mudar.',
    conteudo_invalido: 'O conteúdo não pôde ser gravado. Confira os campos e tente de novo.',
    partes_a_conferir: 'Confira as 4 partes antes de concluir.',
    assistido_sem_plano:
      'O assistido está sem plano de saúde no cadastro. Peça a correção à coordenação geral.',
    texto_curto: 'O texto da evolução precisa de 7 linhas ou mais.',
    poucas_metas_do_mes: 'São precisas 4 metas ou mais para o mês atual.',
    situacao_invalida: 'A evolução não pode mudar para esta situação.',
  },
};

/** A evolução inteira, ou `null` quando ela não existe ou o RLS não a mostra a quem pede. */
export async function buscarEvolucao(id: string): Promise<Evolucao | null> {
  const resposta = await supabase.schema('evolucao').rpc('evolucao_completa', { p_id: id });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      sem_permissao: 'Você não tem acesso a esta evolução.',
      indisponivel: 'Não foi possível carregar a evolução agora. Tente de novo em instantes.',
    });
  }
  return resposta.data === null ? null : esquemaEvolucao.parse(resposta.data);
}

/** Nova evolução do mês aberto (o banco escolhe o mês) para um assistido da carteira. */
export async function criarEvolucao(assistidoId: number): Promise<string> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('evolucoes')
    .insert({ assistido_id: assistidoId })
    .select('id')
    .single();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return z.object({ id: z.string() }).parse(data).id;
}

/** Uma versão nova da parte (E07); se a parte estava conferida, volta para "a conferir" (E08). */
export async function salvarParte(evolucaoId: string, parte: ConteudoDaParte): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('versoes')
    .insert({ evolucao_id: evolucaoId, numero: parte.numero, conteudo: parte.conteudo });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}

/** Marca ou desfaz a conferência de uma parte; quem e quando vêm do banco. */
export async function conferirParte(
  evolucaoId: string,
  numero: NumeroDaParte,
  conferida: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('partes')
    .update({ conferida })
    .eq('evolucao_id', evolucaoId)
    .eq('numero', numero)
    .select('numero');
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  if (data.length === 0) throw new ErroApp('sem_permissao', SEM_PERMISSAO);
}

/** Concluir (em conferência → concluída) ou reabrir (concluída → em conferência), E13. */
export async function mudarSituacao(
  evolucaoId: string,
  situacao: 'concluida' | 'em_conferencia',
): Promise<void> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('evolucoes')
    .update({ situacao })
    .eq('id', evolucaoId)
    .select('id');
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  if (data.length === 0) throw new ErroApp('sem_permissao', SEM_PERMISSAO);
}
