/**
 * Regras do conteúdo da evolução mensal, as mesmas do banco (`interno.linhas_do_texto`,
 * `interno.conferir_conclusao`). A tela usa para avisar antes; o banco tem a última palavra.
 */

/** Os 5 trechos da parte 2, na ordem do manual. */
export const TRECHOS = [
  'abertura',
  'programas',
  'comportamentos',
  'recursos',
  'fechamento',
] as const;

export type Trecho = (typeof TRECHOS)[number];
export type Trechos = Record<Trecho, string>;

/** E10: 1 linha = 95 caracteres (Cambria 12 em A4); o texto precisa de 7 linhas ou mais. */
export const CARACTERES_POR_LINHA = 95;
export const MINIMO_DE_LINHAS = 7;

/** E12: 4 metas ou mais para o mês atual; até 30 por parte, de até 500 caracteres. */
export const MINIMO_DE_METAS_DO_MES = 4;
export const MAXIMO_DE_METAS = 30;
export const MAXIMO_DA_META = 500;
export const MAXIMO_DO_TRECHO = 5000;

/** A frase fixa antes das metas para o mês atual (E12). */
export const FRASE_PADRAO =
  'Para o mês atual, a terapia focará no cumprimento das metas estabelecidas, visando garantir o desenvolvimento evolutivo do assistido. Essas metas são:';

export const TRECHOS_VAZIOS: Trechos = {
  abertura: '',
  programas: '',
  comportamentos: '',
  recursos: '',
  fechamento: '',
};

/** O texto corrido da evolução: os trechos preenchidos, na ordem, unidos por um espaço. */
export function textoDaEvolucao(trechos: Trechos): string {
  return TRECHOS.map((t) => trechos[t].trim())
    .filter((t) => t !== '')
    .join(' ');
}

/** Quantas linhas o texto ocupa no documento (E10). */
export function linhasDoTexto(trechos: Trechos): number {
  return Math.ceil(textoDaEvolucao(trechos).length / CARACTERES_POR_LINHA);
}

/** Uma meta por linha: as linhas preenchidas, sem espaços nas pontas. */
export function metasDoTexto(texto: string): string[] {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '');
}
