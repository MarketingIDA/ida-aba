/**
 * Semelhança com a evolução do mês anterior (E10, P7): a parte do texto que se repete, medida em
 * sequências de 3 palavras (sem maiúscula, acento nem pontuação). 60% ou mais é alerta: o texto
 * deve contar o que mudou no mês, não copiar o anterior.
 */
export const LIMITE_DE_SEMELHANCA = 60;

const TAMANHO = 3;

function palavras(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p !== '');
}

function sequencias(texto: string): Set<string> {
  const lista = palavras(texto);
  const conjunto = new Set<string>();
  for (let i = 0; i + TAMANHO <= lista.length; i++) {
    conjunto.add(lista.slice(i, i + TAMANHO).join(' '));
  }
  return conjunto;
}

/** De 0 a 100: quanto dos dois textos é feito das mesmas sequências de palavras (Dice). */
export function semelhanca(texto: string, anterior: string): number {
  const a = sequencias(texto);
  const b = sequencias(anterior);
  if (a.size === 0 || b.size === 0) return 0;
  let comuns = 0;
  for (const s of a) if (b.has(s)) comuns++;
  return Math.round((200 * comuns) / (a.size + b.size));
}
