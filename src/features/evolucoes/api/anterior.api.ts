import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { evolucoesKeys } from '@/features/evolucoes/queries';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { textoDaEvolucao, TRECHOS, type Trechos } from '@dominio/evolucao.ts';
import { somarMeses } from '@dominio/mes.ts';

/** O texto da evolução do mês anterior do mesmo assistido (P7), ou `null` se não há. */
export interface TextoAnterior {
  mesRef: string;
  texto: string;
}

const esquemaTrechos = z.object(
  Object.fromEntries(TRECHOS.map((t) => [t, z.string()])) as Record<keyof Trechos, z.ZodString>,
);

const SEM_ANTERIOR = 'Não foi possível ler a evolução do mês anterior agora.';

export async function buscarTextoAnterior(
  assistidoId: number,
  mesRef: string,
): Promise<TextoAnterior | null> {
  const anterior = somarMeses(mesRef, -1);
  const evolucao = await supabase
    .schema('evolucao')
    .from('evolucoes')
    .select('id')
    .eq('assistido_id', assistidoId)
    .eq('mes_ref', anterior)
    .maybeSingle<{ id: string }>();
  if (evolucao.error !== null) throw erroDoBanco(evolucao.error, { indisponivel: SEM_ANTERIOR });
  if (evolucao.data === null) return null;
  const versao = await supabase
    .schema('evolucao')
    .from('versoes')
    .select('conteudo')
    .eq('evolucao_id', evolucao.data.id)
    .eq('numero', 2)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<{ conteudo: unknown }>();
  if (versao.error !== null) throw erroDoBanco(versao.error, { indisponivel: SEM_ANTERIOR });
  if (versao.data === null) return null;
  return { mesRef: anterior, texto: textoDaEvolucao(esquemaTrechos.parse(versao.data.conteudo)) };
}

export const textoAnteriorOptions = (assistidoId: number, mesRef: string) =>
  queryOptions({
    queryKey: [...evolucoesKeys.all, 'anterior', assistidoId, mesRef] as const,
    queryFn: () => buscarTextoAnterior(assistidoId, mesRef),
    staleTime: Infinity,
  });
