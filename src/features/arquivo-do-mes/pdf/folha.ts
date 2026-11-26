import type * as PdfLib from 'pdf-lib';
import type { PDFDocument } from 'pdf-lib';

import { ALTURA, criarDesenho, type Desenho, LARGURA } from '@/features/progresso/pdf/desenho';
import { quebrarLinhas } from '@/features/progresso/pdf/texto';

/**
 * A folha do PDF da evolução mensal: o papel timbrado do Instituto atrás de cada página e o texto
 * correndo de cima para baixo, entre a arte do topo e a do rodapé. Quando o que vem não cabe, abre
 * outra folha.
 */
export const MARGEM = 56;
export const UTIL = LARGURA - 2 * MARGEM;
/** A arte ocupa uns 3 cm no topo e no rodapé: o conteúdo fica entre estas duas linhas. */
const TOPO = 102;
const FIM = ALTURA - 104;
/** A linha do rodapé, acima da faixa azul da arte. */
export const RODAPE = ALTURA - 86;

export const COR = {
  azul: '#0A6CFF',
  marinho: '#0B2545',
  texto: '#1F2A3D',
  apagado: '#5B6B82',
  azulClaro: '#EEF5FF',
  fio: '#C9DDFF',
  naFaixa: '#A9CCFF',
  verde: '#00A878',
  ambar: '#B45309',
  ambarClaro: '#FFF6E5',
  branco: '#FFFFFF',
} as const;

export interface Folha {
  d: Desenho;
  /** Até onde a página corrente já foi usada, de cima para baixo. */
  y: number;
  nova: () => void;
  /** Garante a altura pedida na página corrente; se não couber, abre outra. */
  garantir: (altura: number) => void;
}

export async function criarFolha(
  lib: typeof PdfLib,
  doc: PDFDocument,
  arte: Uint8Array,
): Promise<Folha> {
  const fontes = {
    normal: await doc.embedFont(lib.StandardFonts.Helvetica),
    negrito: await doc.embedFont(lib.StandardFonts.HelveticaBold),
  };
  const fundo = await doc.embedPng(arte);
  const d = criarDesenho(lib, doc, fontes);
  const folha: Folha = {
    d,
    y: TOPO,
    nova: () => {
      d.nova().drawImage(fundo, { x: 0, y: 0, width: LARGURA, height: ALTURA });
      folha.y = TOPO;
    },
    garantir: (altura) => {
      if (folha.y + altura > FIM) folha.nova();
    },
  };
  folha.nova();
  return folha;
}

/** O rótulo pequeno, em maiúsculas, que vai acima de um valor ou abre uma seção. */
export function rotulo(f: Folha, texto: string, x: number, y: number, cor: string, tam = 6.5) {
  f.d.texto(texto.toLocaleUpperCase('pt-BR'), x, y, { tam, negrito: true, cor });
}

/** O valor em uma linha só: o que passa da largura é cortado com reticências. */
export function emUmaLinha(f: Folha, texto: string, largura: number, tam: number): string {
  return quebrarLinhas(texto, largura, (s) => f.d.largura(s, tam, true), 1)[0] ?? '';
}

interface Corrido {
  x?: number;
  largura?: number;
  /** A última linha de um parágrafo justificado fica à esquerda; a lista não justifica nenhuma. */
  justificar?: boolean;
}

/** Uma linha com as palavras espalhadas até as duas margens. */
function linhaJustificada(f: Folha, linha: string, x: number, y: number, largura: number) {
  const palavras = linha.split(' ');
  const ocupado = palavras.reduce((soma, p) => soma + f.d.largura(p, CORPO), 0);
  const vao = (largura - ocupado) / (palavras.length - 1);
  let x0 = x;
  for (const palavra of palavras) {
    x0 += f.d.texto(palavra, x0, y, { tam: CORPO, cor: COR.texto }) + vao;
  }
}

const CORPO = 11;
const PASSO = CORPO * 1.5;
/** Da borda de cima da linha até a linha de base do texto. */
const BASE = CORPO * 1.05;

/**
 * O texto corrido, com entrelinha de 1,5, linha a linha: a que não cabe na página vai para a
 * seguinte.
 */
export function corrido(f: Folha, texto: string, op: Corrido = {}) {
  const { x = MARGEM, largura = UTIL, justificar = true } = op;
  const linhas = quebrarLinhas(texto, largura, (s) => f.d.largura(s, CORPO));
  linhas.forEach((linha, i) => {
    f.garantir(PASSO);
    const cheia = justificar && i < linhas.length - 1 && linha.includes(' ');
    if (cheia) linhaJustificada(f, linha, x, f.y + BASE, largura);
    else f.d.texto(linha, x, f.y + BASE, { tam: CORPO, cor: COR.texto });
    f.y += PASSO;
  });
}

/** O título de uma seção: rótulo azul com um fio embaixo. Não fica sozinho no fim da página. */
export function titulo(f: Folha, texto: string) {
  f.garantir(64);
  f.y += 24;
  rotulo(f, texto, MARGEM, f.y, COR.azul, 8.5);
  f.d.linha(
    [
      [MARGEM, f.y + 6],
      [MARGEM + UTIL, f.y + 6],
    ],
    COR.fio,
    0.7,
  );
  f.y += 12;
}

/** A lista de metas: um ponto de cor e o texto com recuo. */
export function lista(f: Folha, itens: readonly string[], cor: string) {
  for (const item of itens) {
    f.garantir(PASSO);
    f.d.circulo(MARGEM + 6, f.y + BASE - 3.6, 2, cor);
    corrido(f, item, { x: MARGEM + 16, largura: UTIL - 16, justificar: false });
  }
}
