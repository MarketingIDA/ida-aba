import { z } from 'zod';

import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';

/**
 * O cadastro de metas de cada assistido (E23), o plano terapêutico. O coordenador mantém as metas
 * da carteira dele e a coordenação geral lê todas: quem decide é o RLS.
 */
export const SITUACOES_DA_META = [
  'desenvolvimento',
  'alcancada',
  'manutencao',
  'suspensa',
] as const;
export type SituacaoDaMeta = (typeof SITUACOES_DA_META)[number];

export interface Meta {
  id: number;
  assistidoId: number;
  programa: string | null;
  texto: string;
  criterio: string;
  situacao: SituacaoDaMeta;
  situacaoEm: string;
}

export type DadosDaMeta = Pick<Meta, 'programa' | 'texto' | 'criterio' | 'situacao'>;

const COLUNAS = 'id, assistido_id, programa, texto, criterio, situacao, situacao_em';

const esquemaMeta = z
  .object({
    id: z.number().int(),
    assistido_id: z.number().int(),
    programa: z.string().nullable(),
    texto: z.string(),
    criterio: z.string(),
    situacao: z.enum(SITUACOES_DA_META),
    situacao_em: z.string(),
  })
  .transform((m): Meta => ({
    id: m.id,
    assistidoId: m.assistido_id,
    programa: m.programa,
    texto: m.texto,
    criterio: m.criterio,
    situacao: m.situacao,
    situacaoEm: m.situacao_em,
  }));

const SEM_PERMISSAO = 'Só o coordenador da carteira altera as metas do assistido.';

const MENSAGENS: MensagensDoBanco = {
  sem_permissao: SEM_PERMISSAO,
  regra_violada: 'A meta não segue uma regra do cadastro. Confira os campos.',
  indisponivel: 'Não foi possível salvar a meta agora. Tente de novo em instantes.',
};

/** As metas de um assistido ou, sem o `assistidoId`, todas as que quem pede pode ler. */
export async function buscarMetas(assistidoId?: number): Promise<Meta[]> {
  const consulta = supabase.schema('cadastro').from('metas').select(COLUNAS).order('id');
  const { data, error } = await (assistidoId === undefined
    ? consulta
    : consulta.eq('assistido_id', assistidoId));
  if (error !== null) {
    throw erroDoBanco(error, {
      indisponivel: 'Não foi possível carregar as metas agora. Tente de novo em instantes.',
    });
  }
  return z.array(esquemaMeta).parse(data);
}

/** Cadastra a meta do assistido ou, com o `id`, altera a que já existe. */
export async function salvarMeta(
  assistidoId: number,
  dados: DadosDaMeta,
  id?: number,
): Promise<Meta> {
  const tabela = supabase.schema('cadastro').from('metas');
  const { data, error } = await (id === undefined
    ? tabela.insert({ assistido_id: assistidoId, ...dados }).select(COLUNAS)
    : tabela.update(dados).eq('id', id).select(COLUNAS));
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  const [salva] = z.array(esquemaMeta).parse(data);
  // Sem linha de volta, o RLS não deixou gravar.
  if (salva === undefined) throw new ErroApp('sem_permissao', SEM_PERMISSAO);
  return salva;
}
