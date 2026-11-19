import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/** O que se fez com o relatório de metas (E28). Quem fez e quando, o banco preenche. */
export type AcaoDoRelatorio = 'baixou' | 'enviou' | 'baixou_para_enviar' | 'copiou_link';

/**
 * Registra o que se fez com o relatório, antes de o arquivo sair: sem registro, não sai. O RLS só
 * aceita o assistido de quem pode vê-lo.
 */
export async function registrarRelatorio(
  assistidoId: number,
  acao: AcaoDoRelatorio,
): Promise<void> {
  const resposta = await supabase
    .schema('evolucao')
    .from('relatorios_de_metas')
    .insert({ assistido_id: assistidoId, acao });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      sem_permissao: 'Você não tem permissão para emitir o relatório deste assistido.',
      indisponivel: 'Não foi possível registrar o relatório agora. Tente de novo.',
    });
  }
}

export interface LinhaDoRegistro {
  id: number;
  acao: AcaoDoRelatorio;
  feitoPorNome: string;
  feitoEm: string;
}

const esquemaDoRegistro = z
  .object({
    id: z.number().int(),
    acao: z.enum(['baixou', 'enviou', 'baixou_para_enviar', 'copiou_link']),
    feito_por_nome: z.string(),
    feito_em: z.string(),
  })
  .transform((l): LinhaDoRegistro => ({
    id: l.id,
    acao: l.acao,
    feitoPorNome: l.feito_por_nome,
    feitoEm: l.feito_em,
  }));

/** Quantas linhas do registro a janela de compartilhar mostra. */
export const LINHAS_DO_REGISTRO = 20;

/** O registro do relatório do assistido, do mais recente ao mais antigo. */
export async function buscarRegistro(assistidoId: number): Promise<LinhaDoRegistro[]> {
  const resposta = await supabase
    .schema('evolucao')
    .from('relatorios_de_metas')
    .select('id, acao, feito_por_nome, feito_em')
    .eq('assistido_id', assistidoId)
    .order('feito_em', { ascending: false })
    .limit(LINHAS_DO_REGISTRO);
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível carregar o registro agora. Tente de novo.',
    });
  }
  return z.array(esquemaDoRegistro).parse(resposta.data);
}
