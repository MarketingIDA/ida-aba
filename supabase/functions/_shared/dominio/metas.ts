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

export interface MetaComPrograma {
  texto: string;
  programa: string;
}

/**
 * A primeira meta para o mês atual cujo programa, no cadastro, o texto da evolução mensal não
 * cita (E12). É alerta, não bloqueio. A comparação é a das lacunas no banco: os dois normalizados,
 * o programa procurado dentro do texto.
 */
export function metaSemProgramaNoTexto(
  doMes: readonly string[],
  doCadastro: readonly MetaComPrograma[],
  texto: string,
): MetaComPrograma | null {
  const normalizado = normalizarMeta(texto);
  const porMeta = new Map(doCadastro.map((m) => [normalizarMeta(m.texto), m]));
  for (const linha of doMes) {
    const meta = porMeta.get(normalizarMeta(linha));
    const programa = normalizarMeta(meta?.programa ?? '');
    if (meta !== undefined && programa !== '' && !normalizado.includes(programa)) {
      return { texto: linha, programa: meta.programa };
    }
  }
  return null;
}
