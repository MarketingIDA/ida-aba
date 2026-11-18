import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import type { CampoDaIA } from '@dominio/rascunho.ts';

/**
 * A dica para a IA (E21): o coordenador diz o que a IA deve fazer diferente num bloco que ela
 * escreveu. A dica nasce pendente, vai para a curadoria da coordenação geral e não muda o texto da
 * evolução. O texto original da IA e quem sugeriu são do banco.
 */
export const MINIMO_DA_DICA = 10;
export const MAXIMO_DA_DICA = 1000;

const MENSAGENS: MensagensDoBanco = {
  sem_permissao: 'Só o coordenador da carteira dá dica para a IA nesta evolução.',
  regra_violada: `A dica precisa de ${String(MINIMO_DA_DICA)} a ${String(MAXIMO_DA_DICA)} caracteres.`,
  indisponivel: 'Não foi possível enviar a dica agora. Tente de novo em instantes.',
  regras: {
    dica_sem_texto_da_ia:
      'Este bloco não tem texto escrito pela IA; a dica vale só para o que ela escreveu.',
  },
};

export async function enviarDica(
  evolucaoId: string,
  campo: CampoDaIA,
  dica: string,
): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('dicas_ia')
    .insert({ evolucao_id: evolucaoId, campo, dica });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}
