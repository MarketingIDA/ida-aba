/**
 * As fontes de cada frase do rascunho (E06, E25). No pedido, cada análise do período leva um
 * número de sessão (S1, S2, …) e cada outro documento um número (D1, D2, …); a IA devolve cada
 * frase e cada meta com os números de onde saiu. Aqui os números viram as datas das sessões e os
 * ids dos documentos, e o que não existe no pedido é descartado: a IA não inventa fonte.
 */

/** Uma frase como a IA devolve, já aparada: o texto e os números das sessões e dos documentos. */
export interface FraseLida {
  texto: string;
  sessoes: number[];
  documentos: number[];
}

/** A frase no seu bloco (um dos 5 trechos ou uma das listas de metas), na ordem em que entrou. */
export interface FraseDoCampo extends FraseLida {
  campo: string;
  ordem: number;
}

/** O que se grava: a frase com as datas das sessões (`AAAA-MM-DD`) e os ids dos documentos. */
export interface Fonte {
  campo: string;
  ordem: number;
  frase: string;
  datas: string[];
  documentos: number[];
}

const inteiros = (valor: unknown): number[] =>
  Array.isArray(valor) ? valor.filter((n): n is number => Number.isInteger(n)) : [];

/** As frases de um bloco; `null` se o bloco não é uma lista. Frase vazia ou fora do formato sai. */
export function lerFrases(valor: unknown): FraseLida[] | null {
  if (!Array.isArray(valor)) return null;
  return valor.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return [];
    const { texto, sessoes, documentos } = item as Record<string, unknown>;
    if (typeof texto !== 'string' || texto.trim() === '') return [];
    return [{ texto: texto.trim(), sessoes: inteiros(sessoes), documentos: inteiros(documentos) }];
  });
}

/** Os itens da lista na posição de número `n` (de 1 em diante), sem repetir e sem os que faltam. */
function daLista<T>(numeros: readonly number[], lista: readonly T[]): T[] {
  const achados = numeros.flatMap((n) => (n >= 1 && n <= lista.length ? [lista[n - 1] as T] : []));
  return [...new Set(achados)];
}

/**
 * Troca os números pelas datas das sessões e pelos ids dos documentos, na mesma ordem do pedido.
 * Número que não está no pedido sai.
 */
export function fontesDasFrases(
  frases: readonly FraseDoCampo[],
  datasDasSessoes: readonly string[],
  idsDosDocumentos: readonly number[],
): Fonte[] {
  return frases.map((f) => ({
    campo: f.campo,
    ordem: f.ordem,
    frase: f.texto,
    datas: daLista(f.sessoes, datasDasSessoes).sort((a, b) => a.localeCompare(b)),
    documentos: daLista(f.documentos, idsDosDocumentos),
  }));
}
