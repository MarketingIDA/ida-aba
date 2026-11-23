import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { evolucoesKeys } from '@/features/evolucoes/queries';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * Os dias do assistido que já entraram noutra evolução mensal (E20): para a data que o PDF trouxe
 * antes do período, o calendário diz em qual mês ela já foi analisada (E19).
 */
const esquemaDia = z.object({ data: z.string(), mes_ref: z.string(), evolucao_id: z.string() });

/** Data → mês da evolução (`AAAA-MM-01`) em que o dia já entrou, sem a evolução atual. */
export async function buscarDiasJaAnalisados(
  assistidoId: number,
  evolucaoId: string,
  datas: readonly string[],
): Promise<Map<string, string>> {
  const resposta = await supabase
    .schema('evolucao')
    .from('dias_analisados')
    .select('data, mes_ref, evolucao_id')
    .eq('assistido_id', assistidoId)
    .in('data', [...datas]);
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível carregar os dias já analisados.',
    });
  }
  const dias = z.array(esquemaDia).parse(resposta.data);
  return new Map(dias.filter((d) => d.evolucao_id !== evolucaoId).map((d) => [d.data, d.mes_ref]));
}

export const diasJaAnalisadosOptions = (
  assistidoId: number,
  evolucaoId: string,
  datas: readonly string[],
) =>
  queryOptions({
    queryKey: [
      ...evolucoesKeys.all,
      'dias-ja-analisados',
      assistidoId,
      evolucaoId,
      datas.join(','),
    ] as const,
    queryFn: () => buscarDiasJaAnalisados(assistidoId, evolucaoId, datas),
  });
