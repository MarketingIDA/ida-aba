/**
 * A meta da evolução e a do cadastro se encontram pelo texto (E12, E23), como no banco
 * (`interno.normalizar_meta`): sem maiúscula, acento, marcador no começo, espaço repetido,
 * pontuação no fim nem a marca "(manutenção)".
 */

/** Sem acento: o banco troca os acentos do português, um a um; aqui vale o mesmo. */
const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Tira do fim os espaços e a pontuação, como o `[[:space:].;:,!]+$` do banco. */
function semPontuacaoNoFim(texto: string): string {
  let fim = texto.length;
  while (fim > 0 && ' .;:,!'.includes(texto.charAt(fim - 1))) fim--;
  return texto.slice(0, fim);
}

export function normalizarMeta(texto: string): string {
  const semMarcador = semAcento(texto.toLowerCase())
    .replace(/\(\s*manutencao\s*\)/g, '')
    .replace(/^[\s•*-]+/, '')
    .replace(/\s+/g, ' ');
  return semPontuacaoNoFim(semMarcador).trim();
}

/** A linha leva a marca "(manutenção)" (E11). */
export const marcadaComoManutencao = (texto: string): boolean =>
  /\(\s*manutencao\s*\)/.test(semAcento(texto.toLowerCase()));

/**
 * A primeira meta para o mês atual que já foi alcançada: no cadastro (alcançada ou em manutenção)
 * ou na parte 3 deste mês. Ela bloqueia a conclusão (E12).
 */
export function metaJaAlcancada(
  doMes: readonly string[],
  alcancadas: readonly string[],
): string | null {
  const chaves = new Set(alcancadas.map(normalizarMeta).filter((c) => c !== ''));
  return doMes.find((m) => chaves.has(normalizarMeta(m))) ?? null;
}
