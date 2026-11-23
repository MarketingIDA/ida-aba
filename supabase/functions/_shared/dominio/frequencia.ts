/**
 * A frequência do período (E04, P5): sessões ÷ evoluções diárias do período analisado, em que a
 * evolução que registra falta não conta como sessão. Abaixo de 75%, a abertura do texto cita a
 * frequência; a tela avisa quando não cita.
 */
export const LIMITE_DA_FREQUENCIA = 75;

/** A frequência em %, arredondada; `null` sem evolução diária no período. */
export function frequenciaDoPeriodo(analises: readonly { falta: boolean }[]): number | null {
  if (analises.length === 0) return null;
  const sessoes = analises.filter((a) => !a.falta).length;
  return Math.round((sessoes / analises.length) * 100);
}

/** Se o texto cita a frequência: a palavra "frequência" ou o percentual com o sinal de %. */
export function citaFrequencia(texto: string, percentual: number): boolean {
  const normalizado = texto.normalize('NFD').replaceAll(/[̀-ͯ]/g, '').toLowerCase();
  return (
    normalizado.includes('frequencia') ||
    new RegExp(String.raw`(^|\D)${String(percentual)}\s?%`).test(normalizado)
  );
}
