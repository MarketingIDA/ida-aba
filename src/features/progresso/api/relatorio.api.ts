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
