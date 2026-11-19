import { NIVEIS_DE_APOIO } from '@dominio/niveis.ts';
import type { MedianaDaCarteira } from '@dominio/mediana.ts';
import { nomeDoMes } from '@dominio/mes.ts';

/** O nome do degrau (1 a 5), ou "Sem nível" quando a análise não diz o nível. */
export const nomeDoNivel = (nivel: number | null): string =>
  nivel === null ? 'Sem nível' : (NIVEIS_DE_APOIO[nivel - 1] ?? 'Sem nível');

/** O nome curto, para o eixo da escada. */
export const NIVEL_CURTO = ['Física total', 'Física parcial', 'Gestual', 'Verbal', 'Independente'];

/** O mês analisado pelo início do período: `outubro`. */
export const mesDoPeriodo = (inicio: string): string => nomeDoMes(`${inicio.slice(0, 7)}-01`);

/** Um número com vírgula decimal, como a mediana `1,5`. */
export const numero = (n: number): string =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** "já chegou" ou "já chegaram", pelo número de metas independentes. */
export const chegaram = (independentes: number): string =>
  independentes === 1 ? 'já chegou' : 'já chegaram';

/**
 * A comparação com a mediana da carteira no fim da janela, a mesma na tela e no PDF; `null` sem
 * mediana. `subiu` diz se o assistido está na mediana ou acima.
 */
export function comparacaoComMediana(
  independentes: number,
  mediana: MedianaDaCarteira | null,
): { texto: string; subiu: boolean } | null {
  if (mediana === null) return null;
  const fim = mediana.porSemana.at(-1) ?? 0;
  const dif = independentes - fim;
  let posicao = 'Na';
  if (dif > 0) posicao = 'Acima da';
  else if (dif < 0) posicao = 'Abaixo da';
  const metas = fim === 1 ? 'meta' : 'metas';
  return {
    texto: `${posicao} mediana da carteira, que é de ${numero(fim)} ${metas}`,
    subiu: dif >= 0,
  };
}
