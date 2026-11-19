import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { evolucoesKeys } from '@/features/evolucoes/queries';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from '@dominio/documentos.ts';

/**
 * As fontes de cada frase do rascunho da IA (E06, E25): as datas das sessões e os documentos de
 * onde a frase ou a meta saiu. São da última versão da IA de cada parte; `versaoAtual` diz se o
 * texto ainda é aquele.
 */
export interface DocumentoDaFonte {
  id: number;
  tipo: TipoDeDocumento;
  data: string | null;
  arquivo: string;
}

export interface FonteDaFrase {
  numero: 2 | 3 | 4;
  campo: string;
  ordem: number;
  frase: string;
  datas: string[];
  documentos: DocumentoDaFonte[];
  versaoAtual: boolean;
  criadoEm: string;
}

const TIPOS = Object.keys(TIPOS_DE_DOCUMENTO) as [TipoDeDocumento, ...TipoDeDocumento[]];

const esquemaFonte = z
  .object({
    numero: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    campo: z.string(),
    ordem: z.number().int(),
    frase: z.string(),
    datas: z.array(z.string()),
    documentos: z.array(
      z.object({
        id: z.number().int(),
        tipo: z.enum(TIPOS),
        data: z.string().nullable(),
        arquivo: z.string(),
      }),
    ),
    versao_atual: z.boolean(),
    criado_em: z.string(),
  })
  .transform(({ versao_atual, criado_em, ...resto }): FonteDaFrase => ({
    ...resto,
    versaoAtual: versao_atual,
    criadoEm: criado_em,
  }));

export async function buscarFontes(evolucaoId: string): Promise<FonteDaFrase[]> {
  const resposta = await supabase
    .schema('evolucao')
    .rpc('fontes_da_evolucao', { p_evolucao: evolucaoId });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível carregar as fontes agora.',
    });
  }
  return z.array(esquemaFonte).parse(resposta.data);
}

export const fontesOptions = (evolucaoId: string) =>
  queryOptions({
    queryKey: [...evolucoesKeys.all, 'fontes', evolucaoId] as const,
    queryFn: () => buscarFontes(evolucaoId),
  });
