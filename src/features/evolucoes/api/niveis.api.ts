import { z } from 'zod';

import { chamarFuncaoDaEvolucao } from '@/features/evolucoes/api/funcoes';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * O nível de apoio (E27): a Edge Function `ler-niveis` lê, nas análises da importação atual, o
 * nível de cada meta com programa e grava. Aqui a tela pede a leitura e consulta a situação dela.
 */
export interface LeituraDeNivel {
  situacao: 'lida' | 'sem_metas' | 'falhou';
  dias: number;
  metas: number;
  lidaEm: string;
}

const esquemaLeitura = z
  .object({
    situacao: z.enum(['lida', 'sem_metas', 'falhou']),
    dias: z.number().int(),
    metas: z.number().int(),
    lida_em: z.string(),
  })
  .transform((l): LeituraDeNivel => ({
    situacao: l.situacao,
    dias: l.dias,
    metas: l.metas,
    lidaEm: l.lida_em,
  }));

/** A situação da leitura da importação atual, ou `null` se os níveis ainda não foram lidos. */
export async function buscarLeituraDeNivel(evolucaoId: string): Promise<LeituraDeNivel | null> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('leituras_de_nivel')
    .select('situacao, dias, metas, lida_em')
    .eq('evolucao_id', evolucaoId)
    .maybeSingle<unknown>();
  if (error !== null) {
    throw erroDoBanco(error, {
      indisponivel: 'Não foi possível carregar o nível de apoio agora.',
    });
  }
  return data === null ? null : esquemaLeitura.parse(data);
}

/** Pede à IA a leitura dos níveis; a situação volta do banco. */
export function lerNiveis(evolucaoId: string): Promise<void> {
  return chamarFuncaoDaEvolucao(
    'ler-niveis',
    evolucaoId,
    'Não foi possível ler o nível de apoio agora. Tente de novo em instantes.',
  );
}
