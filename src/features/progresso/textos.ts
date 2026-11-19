import { NIVEIS_DE_APOIO } from '@dominio/niveis.ts';
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
