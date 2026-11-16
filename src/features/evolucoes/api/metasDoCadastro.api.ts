import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * As metas em desenvolvimento do cadastro de metas do assistido (E23): o ponto de partida das
 * metas para o mês atual da evolução. Só o texto de cada uma, na ordem do cadastro.
 */
export async function buscarMetasEmDesenvolvimento(assistidoId: number): Promise<string[]> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from('metas')
    .select('texto')
    .eq('assistido_id', assistidoId)
    .eq('situacao', 'desenvolvimento')
    .order('id');
  if (error !== null) {
    throw erroDoBanco(error, {
      indisponivel: 'Não foi possível carregar as metas do cadastro agora.',
    });
  }
  return z
    .array(z.object({ texto: z.string() }))
    .parse(data)
    .map((meta) => meta.texto);
}

export const metasEmDesenvolvimentoOptions = (assistidoId: number) =>
  queryOptions({
    queryKey: ['metas', assistidoId, 'em-desenvolvimento'] as const,
    queryFn: () => buscarMetasEmDesenvolvimento(assistidoId),
  });
