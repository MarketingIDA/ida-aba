import type * as PdfLib from 'pdf-lib';
import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';

import { quebrarLinhas, textoDoPdf } from '@/features/progresso/pdf/texto';

/** A4 em pontos, com a margem do relatório. */
export const LARGURA = 595.28;
export const ALTURA = 841.89;
export const MARGEM = 40;
export const UTIL = LARGURA - 2 * MARGEM;
/** Onde o conteúdo de cada página termina: abaixo fica o rodapé. */
export const FIM_DO_CONTEUDO = ALTURA - 60;

export const COR = {
  marinho: '#0E2A47',
  apagado: '#5B6B82',
  linha: '#DCE5F0',
  fundo: '#F6F9FD',
  azul: '#006CFF',
  carteira: '#7D8799',
  claro: '#B9CCE4',
  azulClaro: '#9CC8FF',
  alerta: '#8A6A00',
  branco: '#FFFFFF',
} as const;

type Lib = typeof PdfLib;
type Rgb = ReturnType<Lib['rgb']>;

interface OpcoesDoTexto {
  tam?: number;
  negrito?: boolean;
  cor?: string;
  alinhar?: 'esquerda' | 'direita' | 'centro';
}

/**
 * Desenha de cima para baixo, como na tela (o PDF conta de baixo para cima), e guarda as páginas
 * para o rodapé numerar no fim.
 */
export interface Desenho {
  doc: PDFDocument;
  paginas: PDFPage[];
  pagina: () => PDFPage;
  nova: () => PDFPage;
  /** Volta a desenhar numa página já criada (o rodapé numera todas no fim). */
  irPara: (pagina: PDFPage) => void;
  largura: (s: string, tam: number, negrito?: boolean) => number;
  texto: (s: string, x: number, y: number, op?: OpcoesDoTexto) => number;
  paragrafo: (
    s: string,
    x: number,
    y: number,
    largura: number,
    op?: OpcoesDoTexto & { entrelinha?: number; maximo?: number },
  ) => number;
  retangulo: (x: number, y: number, w: number, h: number, cor: string, borda?: string) => void;
  linha: (pontos: [number, number][], cor: string, espessura?: number) => void;
  circulo: (x: number, y: number, r: number, cor: string) => void;
}

interface Fontes {
  normal: PDFFont;
  negrito: PDFFont;
}

/** As páginas: a corrente, a próxima e a volta a uma já criada. */
function paginacao(doc: PDFDocument) {
  const paginas: PDFPage[] = [];
  let corrente: PDFPage | undefined;
  function nova() {
    const p = doc.addPage([LARGURA, ALTURA]);
    paginas.push(p);
    corrente = p;
    return p;
  }
  return {
    paginas,
    nova,
    atual: () => corrente ?? nova(),
    irPara: (pagina: PDFPage) => {
      corrente = pagina;
    },
  };
}

/** Os traços: retângulo, linha e círculo, em coordenadas de cima para baixo. */
function formas(atual: () => PDFPage, cor: (hex: string) => Rgb) {
  return {
    retangulo: (
      x: number,
      y: number,
      w: number,
      h: number,
      preenchimento: string,
      borda?: string,
    ) => {
      atual().drawRectangle({
        x,
        y: ALTURA - y - h,
        width: w,
        height: h,
        color: cor(preenchimento),
        ...(borda === undefined ? {} : { borderColor: cor(borda), borderWidth: 0.8 }),
      });
    },
    linha: (pontos: [number, number][], c: string, espessura = 1.5) => {
      pontos.slice(1).forEach(([x, y], i) => {
        const [x0, y0] = pontos[i] ?? [x, y];
        atual().drawLine({
          start: { x: x0, y: ALTURA - y0 },
          end: { x, y: ALTURA - y },
          thickness: espessura,
          color: cor(c),
        });
      });
    },
    circulo: (x: number, y: number, r: number, c: string) => {
      atual().drawCircle({ x, y: ALTURA - y, size: r, color: cor(c) });
    },
  };
}

/** O texto: largura, uma linha alinhada e o parágrafo que quebra. */
function escrita(atual: () => PDFPage, cor: (hex: string) => Rgb, fontes: Fontes) {
  const fonte = (negrito = false) => (negrito ? fontes.negrito : fontes.normal);
  const largura = (s: string, tam: number, negrito = false) =>
    fonte(negrito).widthOfTextAtSize(textoDoPdf(s), tam);
  const texto: Desenho['texto'] = (s, x, y, op = {}) => {
    const { tam = 10, negrito = false, alinhar = 'esquerda' } = op;
    const limpo = textoDoPdf(s);
    const w = largura(limpo, tam, negrito);
    let x0 = x;
    if (alinhar === 'direita') x0 = x - w;
    else if (alinhar === 'centro') x0 = x - w / 2;
    atual().drawText(limpo, {
      x: x0,
      y: ALTURA - y,
      size: tam,
      font: fonte(negrito),
      color: cor(op.cor ?? COR.marinho),
    });
    return w;
  };
  const paragrafo: Desenho['paragrafo'] = (s, x, y, w, op = {}) => {
    const { tam = 10, entrelinha = 1.4, maximo } = op;
    const linhas = quebrarLinhas(s, w, (t) => largura(t, tam, op.negrito), maximo);
    linhas.forEach((l, i) => texto(l, x, y + i * tam * entrelinha, op));
    return y + linhas.length * tam * entrelinha;
  };
  return { largura, texto, paragrafo };
}

export function criarDesenho(lib: Lib, doc: PDFDocument, fontes: Fontes): Desenho {
  const cor = (hex: string): Rgb =>
    lib.rgb(
      Number.parseInt(hex.slice(1, 3), 16) / 255,
      Number.parseInt(hex.slice(3, 5), 16) / 255,
      Number.parseInt(hex.slice(5, 7), 16) / 255,
    );
  const { paginas, nova, atual, irPara } = paginacao(doc);
  return {
    doc,
    paginas,
    pagina: atual,
    nova,
    irPara,
    ...escrita(atual, cor, fontes),
    ...formas(atual, cor),
  };
}
