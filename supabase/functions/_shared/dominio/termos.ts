/**
 * Termos inadequados (E10, P12): achar no texto da evolução os termos da lista da coordenação
 * geral, marcar onde estão e trocar pelo termo técnico. O termo vale como palavra inteira, sem
 * ligar para maiúscula, acento nem espaço a mais. É alerta, não bloqueio: o banco não repete esta
 * regra.
 */
import { type Trechos, TRECHOS } from './evolucao.ts';

export interface Termo {
  termo: string;
  substituto: string;
}

/** Um pedaço do texto, marcado quando é um termo da lista. */
export interface Pedaco {
  texto: string;
  marcado: boolean;
}

/** Cada letra sem acento acha também as acentuadas ("agressao" acha "agressão"). */
const ACENTOS = {
  a: '[aáàâãä]',
  e: '[eéèêë]',
  i: '[iíìîï]',
  o: '[oóòôõö]',
  u: '[uúùûü]',
  c: '[cç]',
} as const;

/** Sem acento, em minúsculas e com um espaço só entre as palavras. */
export function normalizarTermo(termo: string): string {
  return termo
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, ' ');
}

/** O termo como trecho de expressão regular. */
function fonteDo(termo: string): string {
  return normalizarTermo(termo)
    .replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll(/[aeiouc]/g, (letra) => ACENTOS[letra as keyof typeof ACENTOS])
    .replaceAll(' ', String.raw`\s+`);
}

/** Acha qualquer uma das fontes, só como palavra inteira; o grupo serve ao `split`. */
function expressaoDe(fontes: readonly string[]): RegExp {
  return new RegExp(String.raw`(?<![\p{L}\d])(${fontes.join('|')})(?![\p{L}\d])`, 'giu');
}

/** Do mais longo para o mais curto: "comportamento agressivo" vem antes de "agressivo". */
const doMaisLongo = (termos: readonly Termo[]) =>
  termos.toSorted((a, b) => b.termo.length - a.termo.length);

/** Os termos da lista que aparecem no texto. O trecho já achado não conta para um termo menor. */
export function termosNoTexto(texto: string, termos: readonly Termo[]): Termo[] {
  const achados: Termo[] = [];
  let resto = texto;
  for (const termo of doMaisLongo(termos)) {
    const semOTermo = resto.replaceAll(expressaoDe([fonteDo(termo.termo)]), ' ');
    if (semOTermo !== resto) achados.push(termo);
    resto = semOTermo;
  }
  return achados;
}

/** O texto em pedaços, para a tela marcar os termos da lista onde eles estão. */
export function marcarTermos(texto: string, termos: readonly Termo[]): Pedaco[] {
  if (termos.length === 0) return [{ texto, marcado: false }];
  const fontes = doMaisLongo(termos).map((t) => fonteDo(t.termo));
  // Com o grupo na expressão, o `split` devolve o texto e os termos alternados.
  return texto
    .split(expressaoDe(fontes))
    .map((pedaco, i) => ({ texto: pedaco, marcado: i % 2 === 1 }))
    .filter((pedaco) => pedaco.texto !== '');
}

const comMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Troca o termo pelo substituto no texto todo; no começo de frase, mantém a maiúscula. */
export function trocarTermo(texto: string, { termo, substituto }: Termo): string {
  return texto.replaceAll(expressaoDe([fonteDo(termo)]), (achado) =>
    /^\p{Lu}/u.test(achado) ? comMaiuscula(substituto) : substituto,
  );
}

/** A troca em um toque (E10): o termo sai dos 5 trechos da parte 2. */
export function trocarNosTrechos(trechos: Trechos, termo: Termo): Trechos {
  return Object.fromEntries(TRECHOS.map((t) => [t, trocarTermo(trechos[t], termo)])) as Trechos;
}
