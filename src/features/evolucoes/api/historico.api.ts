import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { evolucoesKeys } from '@/features/evolucoes/queries';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { TRECHOS } from '@dominio/evolucao.ts';

/**
 * O histórico de uma parte (E07): cada versão gravada, da mais nova à mais antiga, com o autor,
 * quem gravou, quando, a instrução do "gerar de novo" (E08) e o conteúdo, já em linhas: os
 * trechos preenchidos da parte 2 ou as metas das partes 3 e 4.
 */
export interface VersaoDoHistorico {
  id: number;
  autor: 'coordenador' | 'ia';
  instrucao: string | null;
  criadoEm: string;
  criadoPor: string | null;
  linhas: string[];
}

const esquemaMetas = z.object({ metas: z.array(z.string()) });
const esquemaTrechos = z.record(z.string(), z.unknown());

/** O conteúdo em linhas: uma meta por linha ou um trecho preenchido por linha, na ordem. */
export function linhasDoConteudo(conteudo: unknown): string[] {
  const metas = esquemaMetas.safeParse(conteudo);
  if (metas.success) return metas.data.metas;
  const trechos = esquemaTrechos.safeParse(conteudo);
  if (!trechos.success) return [];
  return TRECHOS.flatMap((t) => {
    const texto = trechos.data[t];
    return typeof texto === 'string' && texto.trim() !== '' ? [texto.trim()] : [];
  });
}

const esquemaVersao = z
  .object({
    id: z.number().int(),
    autor: z.enum(['coordenador', 'ia']),
    instrucao: z.string().nullable(),
    criado_em: z.string(),
    criado_por: z.string().nullable(),
    conteudo: z.unknown(),
  })
  .transform((v): VersaoDoHistorico => ({
    id: v.id,
    autor: v.autor,
    instrucao: v.instrucao,
    criadoEm: v.criado_em,
    criadoPor: v.criado_por,
    linhas: linhasDoConteudo(v.conteudo),
  }));

export async function buscarHistorico(
  evolucaoId: string,
  numero: 2 | 3 | 4,
): Promise<VersaoDoHistorico[]> {
  const resposta = await supabase
    .schema('evolucao')
    .rpc('historico_da_parte', { p_evolucao: evolucaoId, p_numero: numero });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível carregar as versões agora.',
    });
  }
  return z.array(esquemaVersao).parse(resposta.data);
}

export const historicoOptions = (evolucaoId: string, numero: 2 | 3 | 4) =>
  queryOptions({
    queryKey: [...evolucoesKeys.all, 'historico', evolucaoId, numero] as const,
    queryFn: () => buscarHistorico(evolucaoId, numero),
  });
