import type { PDFImage } from 'pdf-lib';

import { ALTURA, COR, type Desenho, LARGURA, MARGEM, UTIL } from '@/features/progresso/pdf/desenho';
import { graficoDeIndependencia } from '@/features/progresso/pdf/grafico';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import {
  chegaram,
  comparacaoComMediana,
  mesDoPeriodo,
  nomeDoNivel,
} from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';
import type { AnaliseDaMeta } from '@dominio/progresso.ts';

const DIREITA = LARGURA - MARGEM;
const ALTURA_DO_PAINEL = 210;
const COLUNA = 340;

/** O logo num selo branco, ou o nome do instituto quando a imagem não veio. */
function marca(d: Desenho, logo: PDFImage | null) {
  if (logo === null) {
    d.texto('Instituto do Autismo', MARGEM, 44, { tam: 11, negrito: true, cor: COR.branco });
    return;
  }
  const h = 20;
  const w = (h * logo.width) / logo.height;
  d.retangulo(MARGEM, 26, w + 16, h + 10, COR.branco);
  d.pagina().drawImage(logo, { x: MARGEM + 8, y: ALTURA - 31 - h, width: w, height: h });
}

/** À direita do número: a comparação com a carteira e de onde vêm os pontos. */
function contexto(d: Desenho, dados: DadosDoRelatorio) {
  const { progresso } = dados;
  const largura = DIREITA - COLUNA;
  const comparacao = comparacaoComMediana(progresso.independentes, dados.mediana);
  let y = 96;
  if (comparacao !== null) {
    const op = { tam: 9.5, negrito: true, cor: COR.branco };
    y = d.paragrafo(comparacao.texto, COLUNA, y, largura, op) + 6;
  }
  const sessoes = plural(progresso.dias, 'dia de sessão', 'dias de sessão');
  const periodo = `de ${formatarData(progresso.inicio)} a ${formatarData(progresso.fim)}`;
  const nota = `Nível de apoio lido pela IA em ${sessoes}, ${periodo}. O Tita não traz número: cada ponto vem de uma frase da análise.`;
  d.paragrafo(nota, COLUNA, y, largura, { tam: 8, cor: COR.claro, entrelinha: 1.45 });
}

/** O painel marinho, como o da tela: o logo, o nome, o número grande e a comparação. */
function painel(d: Desenho, dados: DadosDoRelatorio, logo: PDFImage | null, emitido: string) {
  const { progresso } = dados;
  d.retangulo(0, 0, LARGURA, ALTURA_DO_PAINEL, COR.marinho);
  d.retangulo(0, ALTURA_DO_PAINEL, LARGURA, 4, COR.azul);
  marca(d, logo);
  const titulo = { tam: 8.5, negrito: true, cor: COR.azulClaro, alinhar: 'direita' } as const;
  d.texto('Relatório de evolução das metas', DIREITA, 38, titulo);
  d.texto(emitido, DIREITA, 50, { tam: 7.5, cor: COR.claro, alinhar: 'direita' });
  d.texto('EVOLUÇÃO DAS METAS', MARGEM, 86, { tam: 7.5, negrito: true, cor: COR.azulClaro });
  const nome = { tam: 18, negrito: true, cor: COR.branco, maximo: 1 };
  d.paragrafo(dados.nome, MARGEM, 108, COLUNA - MARGEM - 20, nome);
  d.texto(`Código ${dados.codigo}`, MARGEM, 124, { tam: 8.5, cor: COR.claro });
  const numeroGrande = { tam: 56, negrito: true, cor: COR.branco };
  const w = d.texto(String(progresso.independentes), MARGEM - 2, 190, numeroGrande);
  const metas = plural(progresso.ativas, 'meta', 'metas');
  const frase = `de ${metas} ${chegaram(progresso.independentes)} à independência`;
  const op = { tam: 13, negrito: true, cor: COR.branco, entrelinha: 1.2, maximo: 3 };
  d.paragrafo(frase, MARGEM + w + 8, 160, COLUNA - MARGEM - w - 28, op);
  contexto(d, dados);
}

const CARTOES: { rotulo: string; valor: (p: DadosDoRelatorio['progresso']) => number }[] = [
  { rotulo: 'Em desenvolvimento', valor: (p) => p.contagem.desenvolvimento },
  { rotulo: 'Alcançadas', valor: (p) => p.contagem.alcancada },
  { rotulo: 'Em manutenção', valor: (p) => p.contagem.manutencao },
  { rotulo: 'Pedem atenção', valor: (p) => p.contagem.atencao },
];

/** Os quatro cards da situação das metas. */
function cartoes(d: Desenho, dados: DadosDoRelatorio, y: number): number {
  const w = (UTIL - 30) / 4;
  CARTOES.forEach((c, i) => {
    const x = MARGEM + i * (w + 10);
    d.retangulo(x, y, w, 52, COR.fundo, COR.linha);
    d.texto(c.rotulo, x + 10, y + 16, { tam: 8, negrito: true, cor: COR.apagado });
    d.texto(String(c.valor(dados.progresso)), x + 10, y + 42, { tam: 20, negrito: true });
  });
  return y + 52;
}

const programa = (x: AnaliseDaMeta) => x.meta.programa ?? 'Meta';

/** Os destaques da tela, em texto: a mais rápida, a parada e a que sumiu. */
function linhasDeDestaque(dados: DadosDoRelatorio): [string, string][] {
  const { rapida, parada, sumiu } = dados.progresso.destaques;
  const ultimo = dados.periodos.at(-1);
  const linhas: [string, string][] = [];
  if (rapida !== null) {
    const sessoes = plural(rapida.sessoesAteIndependente ?? 0, 'sessão', 'sessões');
    linhas.push(['Mais rápida', `${programa(rapida)}: independente em ${sessoes}`]);
  }
  if (parada !== null) {
    const nivel = nomeDoNivel(parada.ultimo?.nivel ?? null).toLowerCase();
    const semanas = plural(parada.parada, 'semana', 'semanas');
    linhas.push(['No mesmo degrau', `${programa(parada)}: ${nivel} há ${semanas}`]);
  }
  if (sumiu !== null && ultimo !== undefined) {
    const titulo = `Sem registro em ${mesDoPeriodo(ultimo.inicio)}`;
    linhas.push([titulo, `${programa(sumiu)} não aparece nas análises`]);
  }
  return linhas;
}

function destaques(d: Desenho, dados: DadosDoRelatorio, y: number) {
  const linhas = linhasDeDestaque(dados);
  if (linhas.length === 0) return;
  d.texto('Destaques', MARGEM, y + 12, { tam: 11, negrito: true });
  let atual = y + 30;
  for (const [titulo, texto] of linhas) {
    d.texto(titulo.toUpperCase(), MARGEM, atual, { tam: 7, negrito: true, cor: COR.apagado });
    atual = d.paragrafo(texto, MARGEM, atual + 12, UTIL, { tam: 9.5 }) + 6;
  }
}

/** A primeira página: o resumo, como o topo da tela. */
export function paginaDeResumo(
  d: Desenho,
  dados: DadosDoRelatorio,
  logo: PDFImage | null,
  emitido: string,
) {
  d.nova();
  painel(d, dados, logo, emitido);
  const y = cartoes(d, dados, ALTURA_DO_PAINEL + 24);
  const depois = graficoDeIndependencia(d, dados, y + 22);
  destaques(d, dados, depois + 16);
}
