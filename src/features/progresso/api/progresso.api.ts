import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import type { IndependenciaNaCarteira } from '@dominio/mediana.ts';
import type { PeriodoDoProgresso, PontoDoProgresso } from '@dominio/progresso.ts';

/**
 * O que a evolução das metas lê (E27): as últimas evoluções do assistido, a situação da leitura
 * dos níveis de cada uma e os níveis lidos. Quem lê o quê é do RLS: o coordenador, a carteira dele;
 * a coordenação geral, tudo; contas médicas, nada.
 */

/** Quantas evoluções (meses) a tela mostra: a janela dos gráficos. */
export const MESES_NO_GRAFICO = 3;

export interface PeriodoDaEvolucao extends PeriodoDoProgresso {
  evolucaoId: string;
  /** O código da evolução (E16): o relatório de metas leva o do mês mais recente. */
  codigo: string;
  mesRef: string;
  /** A situação da leitura dos níveis: `lida`, `sem_metas`, `falhou` ou `null` (ainda não lida). */
  leitura: string | null;
}

export interface DadosDoProgresso {
  periodos: PeriodoDaEvolucao[];
  pontos: PontoDoProgresso[];
}

const esquemaEvolucao = z.object({
  id: z.string(),
  codigo: z.string(),
  mes_ref: z.string(),
  periodo_inicio: z.string(),
  periodo_fim: z.string(),
});
const esquemaLeitura = z.object({ evolucao_id: z.string(), situacao: z.string() });
const esquemaNivel = z
  .object({
    meta_id: z.number().int(),
    data: z.string(),
    nivel: z.number().int().nullable(),
    trecho: z.string(),
  })
  .transform((n): PontoDoProgresso => ({
    metaId: n.meta_id,
    data: n.data,
    nivel: n.nivel,
    trecho: n.trecho,
  }));

const INDISPONIVEL = 'Não foi possível carregar a evolução das metas agora. Tente de novo.';

/** As evoluções da janela, a situação da leitura de cada uma e os níveis lidos. */
export async function buscarDadosDoProgresso(assistidoId: number): Promise<DadosDoProgresso> {
  const evolucoes = await supabase
    .schema('evolucao')
    .from('evolucoes')
    .select('id, codigo, mes_ref, periodo_inicio, periodo_fim')
    .eq('assistido_id', assistidoId)
    .order('mes_ref', { ascending: false })
    .limit(MESES_NO_GRAFICO);
  if (evolucoes.error !== null) throw erroDoBanco(evolucoes.error, { indisponivel: INDISPONIVEL });
  const lista = z.array(esquemaEvolucao).parse(evolucoes.data);
  if (lista.length === 0) return { periodos: [], pontos: [] };
  const ids = lista.map((e) => e.id);
  const [leituras, niveis] = await Promise.all([
    supabase
      .schema('evolucao')
      .from('leituras_de_nivel')
      .select('evolucao_id, situacao')
      .in('evolucao_id', ids),
    supabase
      .schema('evolucao')
      .from('niveis_de_apoio')
      .select('meta_id, data, nivel, trecho')
      .in('evolucao_id', ids)
      .order('data'),
  ]);
  const erro = leituras.error ?? niveis.error;
  if (erro !== null) throw erroDoBanco(erro, { indisponivel: INDISPONIVEL });
  const situacoes = new Map(
    z
      .array(esquemaLeitura)
      .parse(leituras.data)
      .map((l) => [l.evolucao_id, l.situacao]),
  );
  return {
    periodos: lista.map((e) => ({
      evolucaoId: e.id,
      codigo: e.codigo,
      mesRef: e.mes_ref,
      inicio: e.periodo_inicio,
      fim: e.periodo_fim,
      lido: situacoes.get(e.id) === 'lida',
      leitura: situacoes.get(e.id) ?? null,
    })),
    pontos: z.array(esquemaNivel).parse(niveis.data),
  };
}

const esquemaDaCarteira = z
  .object({ assistido: z.number().int(), independente_em: z.string().nullable() })
  .transform((l): IndependenciaNaCarteira => ({
    assistido: l.assistido,
    independenteEm: l.independente_em,
  }));

/**
 * O dia em que cada meta dos assistidos lidos da carteira chegou à independência na janela, sem
 * identificar ninguém: a base da mediana da carteira.
 */
export async function buscarIndependenciaDaCarteira(
  assistidoId: number,
  inicio: string,
  fim: string,
): Promise<IndependenciaNaCarteira[]> {
  const resposta = await supabase.schema('evolucao').rpc('independencia_da_carteira', {
    p_assistido_id: assistidoId,
    p_inicio: inicio,
    p_fim: fim,
  });
  if (resposta.error !== null) throw erroDoBanco(resposta.error, { indisponivel: INDISPONIVEL });
  return z.array(esquemaDaCarteira).parse(resposta.data);
}
