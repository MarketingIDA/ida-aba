/**
 * A janela dos gráficos das metas (E27): dias, semanas de segunda a domingo e a posição no eixo.
 * As datas são `AAAA-MM-DD`, contadas em UTC para o fuso não mudar o dia.
 */

export const DIA = 86_400_000;
export const dias = (data: string) => Date.parse(`${data}T00:00:00Z`) / DIA;
export const data = (n: number) => new Date(n * DIA).toISOString().slice(0, 10);
/** A segunda-feira da semana do dia. */
export const segunda = (d: string) => {
  const n = dias(d);
  return n - ((new Date(n * DIA).getUTCDay() + 6) % 7);
};

/** Onde o dia cai na janela, de 0 (o início) a 1 (o fim): a posição no eixo dos gráficos. */
export function fracaoDaJanela(dia: string, inicio: string, fim: string): number {
  const total = dias(fim) - dias(inicio);
  return total <= 0 ? 0 : Math.min(1, Math.max(0, (dias(dia) - dias(inicio)) / total));
}

/** As segundas-feiras das semanas que cobrem a janela. */
export function semanasDaJanela(inicio: string, fim: string): string[] {
  const primeira = segunda(inicio);
  const total = Math.floor((dias(fim) - primeira) / 7) + 1;
  return Array.from({ length: total }, (_, i) => data(primeira + 7 * i));
}

/** O número da semana do dia, contado da segunda-feira da primeira semana. */
export const semanaDe = (d: string, primeiraSegunda: number) =>
  Math.floor((dias(d) - primeiraSegunda) / 7);
