import { z } from 'zod';

import { ErroApp } from '@/lib/erroApp';
import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * A devolução de uma evolução concluída (E13): a coordenação geral devolve com o motivo, antes do
 * envio do arquivo do mês, e o coordenador da carteira marca como resolvida. Quem pode o quê é do
 * banco (grants, RLS e triggers); aqui só se traduzem as recusas.
 */
export const MINIMO_DO_MOTIVO = 10;
export const MAXIMO_DO_MOTIVO = 1000;

export const esquemaDevolucao = z
  .object({
    id: z.number().int(),
    motivo: z.string(),
    devolvida_em: z.string(),
    devolvida_por: z.string(),
    resolvida_em: z.string().nullable(),
    resolvida_por: z.string().nullable(),
  })
  .transform((d) => ({
    id: d.id,
    motivo: d.motivo,
    devolvidaEm: d.devolvida_em,
    devolvidaPor: d.devolvida_por,
    resolvidaEm: d.resolvida_em,
    resolvidaPor: d.resolvida_por,
  }));

export type Devolucao = z.output<typeof esquemaDevolucao>;

const SO_O_COORDENADOR = 'Só o coordenador da carteira marca a devolução como resolvida.';

const MENSAGENS: MensagensDoBanco = {
  duplicado: 'Esta evolução já está devolvida. Atualize a página.',
  sem_permissao: 'Só a coordenação geral devolve uma evolução.',
  regra_violada: `O motivo precisa de ${String(MINIMO_DO_MOTIVO)} a ${String(MAXIMO_DO_MOTIVO)} caracteres.`,
  indisponivel: 'Não foi possível salvar agora. Tente de novo em instantes.',
  regras: {
    devolucao_so_de_concluida:
      'Só se devolve a evolução concluída, antes do envio do arquivo do mês. Atualize a página.',
    devolucao_resolvida: 'A devolução já foi resolvida.',
  },
};

/** Devolve a evolução concluída: ela volta para "em conferência", com o motivo como bloqueio. */
export async function devolverEvolucao(evolucaoId: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('devolucoes')
    .insert({ evolucao_id: evolucaoId, motivo });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}

/** Marca a devolução como resolvida; quem e quando vêm do banco. */
export async function resolverDevolucao(id: number): Promise<void> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('devolucoes')
    .update({ resolvida: true })
    .eq('id', id)
    .select('id');
  if (error !== null) throw erroDoBanco(error, { ...MENSAGENS, sem_permissao: SO_O_COORDENADOR });
  if (data.length === 0) throw new ErroApp('sem_permissao', SO_O_COORDENADOR);
}
