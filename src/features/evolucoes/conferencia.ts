import type { Devolucao } from '@/features/evolucoes/api/devolucao.api';
import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import { plural } from '@/features/evolucoes/logica';
import { linhasDoTexto, MINIMO_DE_LINHAS, MINIMO_DE_METAS_DO_MES } from '@dominio/evolucao.ts';
import { metaJaAlcancada } from '@dominio/metas.ts';

/** E11: menos de 4 metas alcançadas no mês é alerta, não bloqueio. */
export const MINIMO_DE_ALCANCADAS = 4;

/** O título de cada parte, como sai no documento. */
export const TITULO_DA_PARTE: Record<NumeroDaParte, string> = {
  1: 'Identificação',
  2: 'Evolução mensal',
  3: 'Metas alcançadas',
  4: 'Metas para o mês atual',
};

export const NUMEROS: readonly NumeroDaParte[] = [1, 2, 3, 4];

export function linhasDa(evolucao: Evolucao): number {
  return evolucao.texto === null ? 0 : linhasDoTexto(evolucao.texto.conteudo);
}

/**
 * O que impede conferir a parte, ou `null`. São as regras que o banco cobra ao concluir (E09,
 * E10, E12): a tela avisa na parte, antes de a conclusão ser recusada.
 */
export function pendenciaDaParte(
  evolucao: Evolucao,
  numero: NumeroDaParte,
  jaAlcancadas: readonly string[] = [],
): string | null {
  if (numero === 1) {
    return evolucao.plano === null
      ? 'O plano de saúde está em branco no cadastro. Peça a correção à coordenação geral.'
      : null;
  }
  if (numero === 2) {
    const linhas = linhasDa(evolucao);
    return linhas < MINIMO_DE_LINHAS
      ? `O texto tem ${plural(linhas, 'linha', 'linhas')}; o mínimo é ${String(MINIMO_DE_LINHAS)}.`
      : null;
  }
  if (numero === 4) return pendenciaDasMetasDoMes(evolucao, jaAlcancadas);
  return null;
}

/**
 * E12: 4 metas ou mais, e nenhuma já alcançada, no cadastro (alcançada ou em manutenção) ou na
 * parte 3 deste mês.
 */
function pendenciaDasMetasDoMes(evolucao: Evolucao, jaAlcancadas: readonly string[]) {
  const metas = evolucao.metasDoMes?.conteudo.metas ?? [];
  if (metas.length < MINIMO_DE_METAS_DO_MES) {
    return `São ${plural(metas.length, 'meta', 'metas')}; o mínimo é ${String(MINIMO_DE_METAS_DO_MES)}.`;
  }
  const alcancadas = [...jaAlcancadas, ...(evolucao.metasAlcancadas?.conteudo.metas ?? [])];
  const repetida = metaJaAlcancada(metas, alcancadas);
  return repetida === null
    ? null
    : `A meta "${repetida}" já foi alcançada; tire-a das metas para o mês atual.`;
}

/** O que a parte deve olhar sem impedir a conferência (E11), ou `null`. */
export function avisoDaParte(evolucao: Evolucao, numero: NumeroDaParte): string | null {
  if (numero !== 3) return null;
  const alcancadas = evolucao.metasAlcancadas?.conteudo.metas.length ?? 0;
  return alcancadas < MINIMO_DE_ALCANCADAS
    ? `${plural(alcancadas, 'meta alcançada', 'metas alcançadas')} no mês; o esperado é ${String(MINIMO_DE_ALCANCADAS)} ou mais. Não impede a conclusão.`
    : null;
}

export function conferidas(evolucao: Evolucao): number {
  return evolucao.partes.filter((p) => p.conferidaEm !== null).length;
}

/** A devolução à espera de o coordenador resolver (E13), ou `null`. */
export function devolucaoAberta(evolucao: Evolucao): Devolucao | null {
  return evolucao.devolucoes.find((d) => d.resolvidaEm === null) ?? null;
}

/** Pronta para concluir: as 4 partes conferidas, nenhuma pendência e nenhuma devolução aberta. */
export function prontaParaConcluir(
  evolucao: Evolucao,
  jaAlcancadas: readonly string[] = [],
): boolean {
  return (
    conferidas(evolucao) === 4 &&
    devolucaoAberta(evolucao) === null &&
    NUMEROS.every((n) => pendenciaDaParte(evolucao, n, jaAlcancadas) === null)
  );
}
