import { COR, type Desenho, MARGEM, UTIL } from '@/features/progresso/pdf/desenho';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import { mesDoPeriodo, numero } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { fracaoDaJanela } from '@dominio/progresso.ts';

const ALTURA_DO_GRAFICO = 170;
const X0 = MARGEM + 24;
const X1 = MARGEM + UTIL - 30;

/** Os pontos da linha em degraus: um degrau por semana, até o fim da janela. */
function degraus(
  serie: readonly number[],
  semanas: readonly string[],
  X: (dia: string) => number,
  Y: (n: number) => number,
): [number, number][] {
  const pontos: [number, number][] = [];
  serie.forEach((n, w) => {
    const x = X(semanas[w] ?? '');
    const anterior = pontos.at(-1);
    if (anterior !== undefined) pontos.push([x, anterior[1]]);
    pontos.push([x, Y(n)]);
  });
  const ultimo = pontos.at(-1);
  if (ultimo !== undefined) pontos.push([X1, ultimo[1]]);
  return pontos;
}

function legenda(d: Desenho, dados: DadosDoRelatorio, y: number) {
  if (dados.mediana === null) return;
  let x = MARGEM;
  d.retangulo(x, y - 4, 14, 2.5, COR.azul);
  x += 18 + d.texto(dados.nome, x + 18, y, { tam: 8, cor: COR.apagado }) + 14;
  d.retangulo(x, y - 4, 14, 2, COR.carteira);
  const assistidos = plural(dados.mediana.assistidos, 'assistido', 'assistidos');
  d.texto(`Mediana da carteira · ${assistidos}`, x + 18, y, { tam: 8, cor: COR.apagado });
}

interface Escalas {
  X: (dia: string) => number;
  Y: (n: number) => number;
  topo: number;
  base: number;
}

function eixos(d: Desenho, dados: DadosDoRelatorio, { X, Y, topo, base }: Escalas) {
  const passo = topo > 8 ? 2 : 1;
  for (let t = 0; t <= topo; t += passo) {
    d.linha(
      [
        [X0, Y(t)],
        [X1, Y(t)],
      ],
      COR.linha,
      0.6,
    );
    d.texto(String(t), X0 - 8, Y(t) + 3, { tam: 7.5, cor: COR.apagado, alinhar: 'direita' });
  }
  for (const p of dados.periodos) {
    d.linha(
      [
        [X(p.inicio), Y(topo) - 6],
        [X(p.inicio), base],
      ],
      COR.linha,
      0.6,
    );
    const meio = (X(p.inicio) + X(p.fim)) / 2;
    d.texto(mesDoPeriodo(p.inicio), meio, base + 14, {
      tam: 7.5,
      cor: COR.apagado,
      alinhar: 'centro',
    });
  }
}

/** Metas que chegaram à independência, semana a semana, diante da mediana da carteira. */
export function graficoDeIndependencia(d: Desenho, dados: DadosDoRelatorio, y: number): number {
  const { progresso, mediana } = dados;
  const { inicio, fim, semanas, porSemana } = progresso;
  d.texto('Metas independentes, semana a semana', MARGEM, y + 12, { tam: 11, negrito: true });
  legenda(d, dados, y + 28);
  const topo = Math.ceil(Math.max(4, ...porSemana, ...(mediana?.porSemana ?? [])));
  const base = y + 44 + ALTURA_DO_GRAFICO;
  const X = (dia: string) =>
    X0 + fracaoDaJanela(dia < inicio ? inicio : dia, inicio, fim) * (X1 - X0);
  const Y = (n: number) => base - (n / topo) * ALTURA_DO_GRAFICO;
  eixos(d, dados, { X, Y, topo, base });
  if (mediana !== null) d.linha(degraus(mediana.porSemana, semanas, X, Y), COR.carteira, 1.4);
  d.linha(degraus(porSemana, semanas, X, Y), COR.azul, 2.2);
  const final = porSemana.at(-1) ?? 0;
  d.circulo(X1, Y(final), 3.5, COR.azul);
  d.texto(String(final), X1 + 8, Y(final) + 4, { tam: 11, negrito: true });
  const daCarteira = mediana?.porSemana.at(-1);
  if (daCarteira !== undefined && Math.abs(Y(daCarteira) - Y(final)) >= 12) {
    d.texto(numero(daCarteira), X1 + 8, Y(daCarteira) + 3, { tam: 8.5, cor: COR.carteira });
  }
  return base + 20;
}
