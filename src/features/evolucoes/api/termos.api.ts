import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import type { Termo } from '@dominio/termos.ts';

/**
 * Os termos inadequados ativos (E10, P12), para a evolução alertar. A lista é da coordenação
 * geral, que a mantém em Cadastros; aqui ela só é lida.
 */
const esquemaTermo = z.object({ termo: z.string(), substituto: z.string() });

export async function buscarTermosAtivos(): Promise<Termo[]> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from('termos_inadequados')
    .select('termo, substituto')
    .eq('ativo', true)
    .order('termo');
  if (error !== null) throw erroDoBanco(error);
  return z.array(esquemaTermo).parse(data);
}

/** A lista muda pouco: vale por 5 minutos. A raiz da chave é a mesma do cadastro de termos. */
export const termosAtivosOptions = () =>
  queryOptions({
    queryKey: ['termos-inadequados', 'ativos'] as const,
    queryFn: buscarTermosAtivos,
    staleTime: 5 * 60_000,
  });
