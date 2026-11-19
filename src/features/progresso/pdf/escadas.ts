import { SITUACAO_DA_META } from '@/features/cadastros/metas';
import { COR, type Desenho, FIM_DO_CONTEUDO, MARGEM, UTIL } from '@/features/progresso/pdf/desenho';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import { NIVEL_CURTO, nomeDoNivel } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { type AnaliseDaMeta, fracaoDaJanela } from '@dominio/progresso.ts';

const LARGURA_DO_CARD = (UTIL - 14) / 2;
const ALTURA_DO_CARD = 168;
const ALTURA_DA_ESCADA = 64;
const ROTULOS = 62;

/** A escada da meta: um ponto por dia de sessão com nível, em degraus. */
function escada(d: Desenho, x: AnaliseDaMeta, dados: DadosDoRelatorio, x0: number, y0: number) {
  const { inicio, fim } = dados.progresso;
  const esquerda = x0 + ROTULOS;
  const direita = x0 + LARGURA_DO_CARD - 12;
  const X = (dia: string) => esquerda + fracaoDaJanela(dia, inicio, fim) * (direita - esquerda);
  const Y = (nivel: number) => y0 + ALTURA_DA_ESCADA - ((nivel - 1) * ALTURA_DA_ESCADA) / 4;
  NIVEL_CURTO.forEach((nome, i) => {
    const y = Y(i + 1);
    const grade: [number, number][] = [
      [esquerda, y],
      [direita, y],
    ];
    d.linha(grade, COR.linha, 0.5);
    d.texto(nome, esquerda - 5, y + 2.5, { tam: 6.5, cor: COR.apagado, alinhar: 'direita' });
  });
  const pontos: [number, number][] = [];
  for (const p of x.comNivel) {
    const anterior = pontos.at(-1);
    if (anterior !== undefined) pontos.push([X(p.data), anterior[1]]);
    pontos.push([X(p.data), Y(p.nivel ?? 1)]);
  }
  if (pontos.length > 1) d.linha(pontos, COR.azul, 1.4);
  for (const [px, py] of pontos) d.circulo(px, py, 1.8, COR.azul);
}

/** Por que a meta não tem escada, ou `null` quando tem. */
function semEscada(x: AnaliseDaMeta): string | null {
  if (x.meta.programa === null)
    return 'Meta sem programa no cadastro: a IA não tem onde ler o nível.';
  if (x.pontos.length === 0) return 'Nenhuma sessão com este programa nas análises lidas.';
  return null;
}

function rodapeDoCard(d: Desenho, x: AnaliseDaMeta, x0: number, y: number) {
  const agora = x.ultimo === null ? 'Sem nível lido' : `Agora: ${nomeDoNivel(x.ultimo.nivel)}`;
  d.texto(agora, x0 + 10, y, { tam: 8, negrito: true });
  const sessoes = plural(x.pontos.length, 'sessão', 'sessões');
  const semNivel = x.semNivel > 0 ? ` · ${String(x.semNivel)} sem nível` : '';
  const op = { tam: 7.5, cor: COR.apagado, alinhar: 'direita' } as const;
  d.texto(`${sessoes}${semNivel}`, x0 + LARGURA_DO_CARD - 10, y, op);
}

function card(d: Desenho, x: AnaliseDaMeta, dados: DadosDoRelatorio, x0: number, y0: number) {
  d.retangulo(x0, y0, LARGURA_DO_CARD, ALTURA_DO_CARD, COR.branco, COR.linha);
  if (x.atencao) d.retangulo(x0, y0, LARGURA_DO_CARD, 3, '#FFCF00');
  d.texto(x.meta.programa ?? 'sem programa', x0 + 10, y0 + 18, {
    tam: 9,
    negrito: true,
    cor: COR.azul,
  });
  const situacao = SITUACAO_DA_META[x.meta.situacao].rotulo;
  const op = { tam: 7.5, negrito: true, cor: COR.apagado, alinhar: 'direita' } as const;
  d.texto(situacao, x0 + LARGURA_DO_CARD - 10, y0 + 18, op);
  const texto = { tam: 8.5, negrito: true, maximo: 2, entrelinha: 1.3 };
  d.paragrafo(x.meta.texto, x0 + 10, y0 + 34, LARGURA_DO_CARD - 20, texto);
  const vazio = semEscada(x);
  if (vazio === null) escada(d, x, dados, x0 + 4, y0 + 62);
  else d.paragrafo(vazio, x0 + 10, y0 + 80, LARGURA_DO_CARD - 20, { tam: 8, cor: COR.apagado });
  rodapeDoCard(d, x, x0, y0 + ALTURA_DO_CARD - 12);
}

/** A escada de cada meta, em duas colunas, na ordem da tela e sem filtro. */
export function paginasDasEscadas(
  d: Desenho,
  dados: DadosDoRelatorio,
  metas: readonly AnaliseDaMeta[],
) {
  d.nova();
  d.texto('A escada de cada meta', MARGEM, MARGEM + 12, { tam: 13, negrito: true });
  const nota =
    'Do degrau de mais apoio (ajuda física total) até independente. Cada ponto é um dia de sessão; a frase da análise de cada ponto está na tabela das sessões.';
  let y = d.paragrafo(nota, MARGEM, MARGEM + 30, UTIL, { tam: 8.5, cor: COR.apagado }) + 8;
  metas.forEach((x, i) => {
    const coluna = i % 2;
    if (coluna === 0 && y + ALTURA_DO_CARD > FIM_DO_CONTEUDO) {
      d.nova();
      y = MARGEM;
    }
    card(d, x, dados, MARGEM + coluna * (LARGURA_DO_CARD + 14), y);
    if (coluna === 1 || i === metas.length - 1) y += ALTURA_DO_CARD + 12;
  });
}
