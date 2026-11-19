/**
 * A mediana da carteira na evolução das metas em gráfico (E27): semana a semana, a mediana de
 * quantas metas cada assistido lido da carteira já tinha levado à independência. Cada assistido é
 * contado como a linha do próprio assistido na tela (acumuladoPorSemana), para as duas linhas só
 * diferirem pelos dados. Domínio puro.
 */

import { acumuladoPorSemana } from './janela.ts';

/** Uma linha da RPC: o número de ordem do assistido e o dia da independência (nulo: nenhum). */
export interface IndependenciaNaCarteira {
  assistido: number;
  independenteEm: string | null;
}

export interface MedianaDaCarteira {
  /** Quantos assistidos lidos entram na conta, o próprio incluído. */
  assistidos: number;
  porSemana: number[];
}

/** A mediana de uma lista de números; a lista vazia dá 0. */
export function mediana(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const meio = v.length >> 1;
  // Os do centro: um, com quantidade ímpar; dois, com par.
  const centro = v.slice(meio - 1 + (v.length % 2), meio + 1);
  return centro.reduce((t, n) => t + n, 0) / centro.length;
}

/** A mediana da carteira em cada semana da janela de `inicio` a `fim`. */
export function medianaDaCarteira(
  linhas: readonly IndependenciaNaCarteira[],
  inicio: string,
  fim: string,
): MedianaDaCarteira {
  const datas = new Map<number, string[]>();
  for (const l of linhas) {
    const lista = datas.get(l.assistido) ?? [];
    if (l.independenteEm !== null) lista.push(l.independenteEm);
    datas.set(l.assistido, lista);
  }
  const series = [...datas.values()].map((d) => acumuladoPorSemana(d, inicio, fim));
  const semanas = acumuladoPorSemana([], inicio, fim);
  return {
    assistidos: series.length,
    porSemana: semanas.map((_, w) => mediana(series.flatMap((s) => s.slice(w, w + 1)))),
  };
}
