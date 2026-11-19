import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { evolucoesKeys } from '@/features/evolucoes/queries';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * Lacunas da evolução mensal (E10): programas do plano terapêutico que não aparecem nas análises
 * do período. O banco calcula; a lacuna se resolve quando o texto cita o programa (foi trabalhado,
 * ou a frase de que não foi), ou quando o coordenador a ignora. Aberta, bloqueia a conclusão.
 */
export interface Lacuna {
  programa: string;
  situacao: 'aberta' | 'resolvida' | 'ignorada';
  /** As metas em desenvolvimento do programa (o alerta da parte 4, E12). */
  metas: string[];
  ignoradaPor: string | null;
  ignoradaEm: string | null;
}

const esquemaLacuna = z
  .object({
    programa: z.string(),
    situacao: z.enum(['aberta', 'resolvida', 'ignorada']),
    metas: z.array(z.string()),
    ignorada_por: z.string().nullable(),
    ignorada_em: z.string().nullable(),
  })
  .transform((l): Lacuna => ({
    programa: l.programa,
    situacao: l.situacao,
    metas: l.metas,
    ignoradaPor: l.ignorada_por,
    ignoradaEm: l.ignorada_em,
  }));

export async function buscarLacunas(evolucaoId: string): Promise<Lacuna[]> {
  const resposta = await supabase.schema('evolucao').rpc('lacunas', { p_evolucao: evolucaoId });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível conferir as lacunas agora.',
    });
  }
  return z.array(esquemaLacuna).parse(resposta.data);
}

export async function ignorarLacuna(evolucaoId: string, programa: string): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('lacunas_ignoradas')
    .insert({ evolucao_id: evolucaoId, programa });
  if (error !== null) {
    throw erroDoBanco(error, {
      duplicado: 'Esta lacuna já foi ignorada.',
      indisponivel: 'Não foi possível ignorar a lacuna agora. Tente de novo em instantes.',
      regras: { evolucao_fechada: 'A evolução não está em conferência. Reabra antes de mudar.' },
    });
  }
}

export const lacunasOptions = (evolucaoId: string) =>
  queryOptions({
    queryKey: evolucoesKeys.lacunas(evolucaoId),
    queryFn: () => buscarLacunas(evolucaoId),
  });

export function useIgnorarLacuna(evolucaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (programa: string) => ignorarLacuna(evolucaoId, programa),
    onSettled: () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.lacunas(evolucaoId) }),
  });
}
