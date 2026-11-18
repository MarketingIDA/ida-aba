import { z } from 'zod';

import { ErroApp } from '@/lib/erroApp';
import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { CAMPOS_DA_IA } from '@dominio/rascunho.ts';

/**
 * A curadoria das dicas para a IA (E22): a coordenação geral aprova a dica, que vira orientação,
 * ou a descarta; e retira a orientação que não deve mais ser lida. Quem pode o quê é do banco
 * (grants, RLS e triggers); aqui só se traduzem as recusas.
 */
export const SITUACOES_DA_DICA = ['pendente', 'aprovada', 'descartada'] as const;
export type SituacaoDaDica = (typeof SITUACOES_DA_DICA)[number];

export const MINIMO_DA_ORIENTACAO = 10;
export const MAXIMO_DA_ORIENTACAO = 600;

const esquemaDica = z
  .object({
    id: z.number().int(),
    campo: z.enum(CAMPOS_DA_IA),
    texto_original: z.string(),
    dica: z.string(),
    situacao: z.enum(SITUACOES_DA_DICA),
    criado_em: z.string(),
    criado_por_nome: z.string(),
    decidida_em: z.string().nullable(),
    decidida_por_nome: z.string().nullable(),
    motivo: z.string().nullable(),
  })
  .transform((d) => ({
    id: d.id,
    campo: d.campo,
    textoOriginal: d.texto_original,
    dica: d.dica,
    situacao: d.situacao,
    criadoEm: d.criado_em,
    criadoPor: d.criado_por_nome,
    decididaEm: d.decidida_em,
    decididaPor: d.decidida_por_nome,
    motivo: d.motivo,
  }));

const esquemaOrientacao = z
  .object({
    id: z.number().int(),
    campo: z.enum(CAMPOS_DA_IA),
    texto: z.string(),
    ativa: z.boolean(),
    criado_em: z.string(),
  })
  .transform((o) => ({
    id: o.id,
    campo: o.campo,
    texto: o.texto,
    ativa: o.ativa,
    aprovadaEm: o.criado_em,
  }));

export type Dica = z.output<typeof esquemaDica>;
export type Orientacao = z.output<typeof esquemaOrientacao>;

const SO_A_COORDENACAO_GERAL = 'Só a coordenação geral faz a curadoria das dicas.';

const MENSAGENS: MensagensDoBanco = {
  duplicado: 'Esta dica já virou orientação. Atualize a página.',
  sem_permissao: SO_A_COORDENACAO_GERAL,
  regra_violada: `A orientação precisa de ${String(MINIMO_DA_ORIENTACAO)} a ${String(MAXIMO_DA_ORIENTACAO)} caracteres; o motivo do descarte, de 3 a 500.`,
  indisponivel: 'Não foi possível salvar agora. Tente de novo em instantes.',
  regras: { dica_ja_decidida: 'Esta dica já foi decidida. Atualize a página.' },
};

const tabela = (nome: 'dicas_ia' | 'orientacoes_ia') => supabase.schema('evolucao').from(nome);

/** As dicas, da mais nova para a mais antiga. */
export async function buscarDicas(): Promise<Dica[]> {
  const { data, error } = await tabela('dicas_ia')
    .select(
      'id, campo, texto_original, dica, situacao, criado_em, criado_por_nome, decidida_em, decidida_por_nome, motivo',
    )
    .order('id', { ascending: false });
  if (error !== null) throw erroDoBanco(error);
  return z.array(esquemaDica).parse(data);
}

export async function buscarOrientacoes(): Promise<Orientacao[]> {
  const { data, error } = await tabela('orientacoes_ia')
    .select('id, campo, texto, ativa, criado_em')
    .order('id', { ascending: false });
  if (error !== null) throw erroDoBanco(error);
  return z.array(esquemaOrientacao).parse(data);
}

/** Aprovar é gravar a orientação com a dica de onde ela vem; o banco decide a dica. */
export async function aprovarDica(dicaId: number, texto: string): Promise<void> {
  const { error } = await tabela('orientacoes_ia').insert({ dica_id: dicaId, texto });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}

/** Mudou alguma linha? Sem linha, o RLS escondeu a de quem não é da coordenação geral. */
function conferir(resposta: { data: unknown[] | null; error: { code?: string } | null }): void {
  if (resposta.error !== null) throw erroDoBanco(resposta.error, MENSAGENS);
  if (resposta.data?.length !== 1) throw new ErroApp('sem_permissao', SO_A_COORDENACAO_GERAL);
}

/** Descarta a dica pendente; o motivo é opcional e fica no registro. */
export async function descartarDica(id: number, motivo: string): Promise<void> {
  conferir(
    await tabela('dicas_ia')
      .update({ situacao: 'descartada', motivo: motivo.trim() === '' ? null : motivo.trim() })
      .eq('id', id)
      .select('id'),
  );
}

/** Retira a orientação (a IA deixa de ler) ou volta a usá-la. */
export async function mudarOrientacao(id: number, ativa: boolean): Promise<void> {
  conferir(await tabela('orientacoes_ia').update({ ativa }).eq('id', id).select('id'));
}
