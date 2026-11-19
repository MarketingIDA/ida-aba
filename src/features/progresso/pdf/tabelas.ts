import { SITUACAO_DA_META } from '@/features/cadastros/metas';
import { COR, type Desenho, FIM_DO_CONTEUDO, MARGEM, UTIL } from '@/features/progresso/pdf/desenho';
import { quebrarLinhas } from '@/features/progresso/pdf/texto';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import { mesDoPeriodo, nomeDoNivel, numero } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';
import type { AnaliseDaMeta, PontoDoProgresso } from '@dominio/progresso.ts';

const TAM = 7.5;
const ENTRELINHA = TAM * 1.35;

interface Coluna {
  titulo: string;
  /** A fração da largura útil. */
  fracao: number;
}

function cabecalho(d: Desenho, colunas: readonly Coluna[], y: number): number {
  let x = MARGEM;
  d.retangulo(MARGEM, y, UTIL, 16, COR.fundo);
  for (const c of colunas) {
    d.texto(c.titulo, x + 4, y + 11, { tam: TAM, negrito: true, cor: COR.apagado });
    x += c.fracao * UTIL;
  }
  return y + 16;
}

/** Uma tabela com título, que segue para a página seguinte repetindo o cabeçalho. */
function tabela(
  d: Desenho,
  titulo: string,
  colunas: readonly Coluna[],
  linhas: readonly string[][],
  inicio: number,
): number {
  let y = inicio;
  if (y + 60 > FIM_DO_CONTEUDO) {
    d.nova();
    y = MARGEM;
  }
  d.texto(titulo, MARGEM, y + 12, { tam: 11, negrito: true });
  y = cabecalho(d, colunas, y + 20);
  for (const linha of linhas) {
    const celulas = linha.map((texto, i) =>
      quebrarLinhas(texto, (colunas[i]?.fracao ?? 0) * UTIL - 8, (s) => d.largura(s, TAM)),
    );
    const altura = Math.max(1, ...celulas.map((c) => c.length)) * ENTRELINHA + 6;
    if (y + altura > FIM_DO_CONTEUDO) {
      d.nova();
      y = cabecalho(d, colunas, MARGEM);
    }
    let x = MARGEM;
    celulas.forEach((c, i) => {
      c.forEach((l, j) => d.texto(l, x + 4, y + 10 + j * ENTRELINHA, { tam: TAM }));
      x += (colunas[i]?.fracao ?? 0) * UTIL;
    });
    y += altura;
    d.linha(
      [
        [MARGEM, y],
        [MARGEM + UTIL, y],
      ],
      COR.linha,
      0.5,
    );
  }
  return y + 18;
}

const nivelEData = (p: PontoDoProgresso | null) =>
  p === null ? '—' : `${nomeDoNivel(p.nivel)} (${formatarData(p.data, true)})`;

function atencao(x: AnaliseDaMeta, ultimoMes: string): string {
  if (x.parada > 0) return `Mesmo degrau há ${plural(x.parada, 'semana', 'semanas')}`;
  if (x.sumiu) return `Sem registro em ${ultimoMes}`;
  return '—';
}

function linhaDaMeta(x: AnaliseDaMeta, ultimoMes: string): string[] {
  const independente =
    x.independente === null
      ? '—'
      : `${formatarData(x.independente.data, true)} · ${plural(x.sessoesAteIndependente ?? 0, 'sessão', 'sessões')}`;
  return [
    `${x.meta.programa ?? 'sem programa'}: ${x.meta.texto}`,
    SITUACAO_DA_META[x.meta.situacao].rotulo,
    String(x.pontos.length),
    nivelEData(x.primeiro),
    nivelEData(x.ultimo),
    independente,
    atencao(x, ultimoMes),
  ];
}

const COLUNAS_DAS_METAS: Coluna[] = [
  { titulo: 'Meta', fracao: 0.3 },
  { titulo: 'Situação', fracao: 0.11 },
  { titulo: 'Sessões', fracao: 0.07 },
  { titulo: 'Primeiro nível', fracao: 0.13 },
  { titulo: 'Nível agora', fracao: 0.13 },
  { titulo: 'Independente em', fracao: 0.13 },
  { titulo: 'Atenção', fracao: 0.13 },
];

/** As tabelas com os números: as metas, a independência por semana e cada sessão com a frase. */
export function paginasDasTabelas(
  d: Desenho,
  dados: DadosDoRelatorio,
  metas: readonly AnaliseDaMeta[],
) {
  const { progresso, mediana } = dados;
  d.nova();
  const ultimoMes = mesDoPeriodo(progresso.fim);
  let y = tabela(
    d,
    'Metas',
    COLUNAS_DAS_METAS,
    metas.map((x) => linhaDaMeta(x, ultimoMes)),
    MARGEM,
  );
  const porSemana: Coluna[] = [
    { titulo: 'Semana de', fracao: 0.3 },
    { titulo: dados.nome, fracao: 0.35 },
  ];
  if (mediana !== null) porSemana.push({ titulo: 'Mediana da carteira', fracao: 0.35 });
  const semanas = progresso.semanas.map((s, w) => {
    const linha = [formatarData(s, true), String(progresso.porSemana[w] ?? 0)];
    if (mediana !== null) linha.push(numero(mediana.porSemana[w] ?? 0));
    return linha;
  });
  y = tabela(d, 'Metas que chegaram à independência, por semana', porSemana, semanas, y);
  const sessoes = metas
    .flatMap((x) => x.pontos.map((p) => ({ x, p })))
    .sort((a, b) => (a.p.data < b.p.data ? -1 : 1))
    .map(({ x, p }) => [
      formatarData(p.data, true),
      x.meta.programa ?? 'sem programa',
      nomeDoNivel(p.nivel),
      p.trecho,
    ]);
  const colunas: Coluna[] = [
    { titulo: 'Dia', fracao: 0.1 },
    { titulo: 'Meta', fracao: 0.18 },
    { titulo: 'Nível', fracao: 0.14 },
    { titulo: 'Frase da análise', fracao: 0.58 },
  ];
  tabela(d, 'Cada sessão, com a frase da análise', colunas, sessoes, y);
}
