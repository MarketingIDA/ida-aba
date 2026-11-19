/**
 * O texto do PDF do relatório de metas. As fontes padrão do PDF (Helvetica) só escrevem os
 * caracteres do WinAnsi: o resto viria de uma análise do Tita ou de um cadastro e quebraria a
 * geração, então é trocado ou tirado antes.
 */

/** Os caracteres além do Latin-1 que o WinAnsi escreve. */
const EXTRAS_DO_WINANSI = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

const TROCAS: Record<string, string> = {
  '≥': '>=',
  '≤': '<=',
  '→': '->',
  '←': '<-',
  '−': '-',
  '‐': '-',
  '‑': '-',
  '′': "'",
  '″': '"',
};

const ehEspaco = (c: string) => /\s/u.test(c);

/** O texto que a Helvetica do PDF consegue escrever: troca o que dá e tira o que não dá. */
export function textoDoPdf(texto: string): string {
  let saida = '';
  for (const c of texto.normalize('NFC')) {
    const codigo = c.codePointAt(0) ?? 0;
    if (TROCAS[c] !== undefined) saida += TROCAS[c];
    else if (ehEspaco(c)) saida += ' ';
    else if ((codigo >= 0x20 && codigo < 0x7f) || (codigo >= 0xa0 && codigo <= 0xff)) saida += c;
    else if (EXTRAS_DO_WINANSI.has(c)) saida += c;
  }
  return saida.replace(/ {2,}/g, ' ');
}

/** Quebra o texto em linhas que cabem na largura, palavra por palavra. */
export function quebrarLinhas(
  texto: string,
  largura: number,
  medir: (s: string) => number,
  maximo = Infinity,
): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of textoDoPdf(texto).split(' ').filter(Boolean)) {
    const tentativa = atual === '' ? palavra : `${atual} ${palavra}`;
    if (atual !== '' && medir(tentativa) > largura) {
      linhas.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  if (atual !== '') linhas.push(atual);
  if (linhas.length <= maximo) return linhas;
  const cortadas = linhas.slice(0, maximo);
  cortadas[maximo - 1] = `${cortadas[maximo - 1] ?? ''}…`;
  return cortadas;
}
