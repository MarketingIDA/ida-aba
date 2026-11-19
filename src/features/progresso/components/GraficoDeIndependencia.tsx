import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import { mesDoPeriodo } from '@/features/progresso/textos';
import { formatarData } from '@dominio/mes.ts';
import { fracaoDaJanela, type Progresso } from '@dominio/progresso.ts';

const W = 560;
const H = 250;
const X0 = 30;
const X1 = 516;
const Y0 = 24;
const Y1 = 210;
const EIXO = 'fill-[#9fb3cc] text-[11px] font-bold';

export interface PropsDoGrafico {
  nome: string;
  progresso: Progresso;
  periodos: readonly PeriodoDaEvolucao[];
}

interface Escalas {
  X: (dia: string) => number;
  Y: (n: number) => number;
}

function Eixos({
  marcas,
  periodos,
  X,
  Y,
}: Readonly<Escalas & { marcas: number[]; periodos: readonly PeriodoDaEvolucao[] }>) {
  return (
    <>
      {marcas.map((t) => (
        <g key={t}>
          <line x1={X0} x2={X1} y1={Y(t)} y2={Y(t)} className="stroke-white/10" />
          <text x={X0 - 10} y={Y(t) + 4} textAnchor="end" className={EIXO}>
            {t}
          </text>
        </g>
      ))}
      {periodos.map((p) => (
        <g key={p.evolucaoId}>
          <line x1={X(p.inicio)} x2={X(p.inicio)} y1={Y0 - 8} y2={Y1} className="stroke-white/10" />
          <text x={(X(p.inicio) + X(p.fim)) / 2} y={H - 12} textAnchor="middle" className={EIXO}>
            {mesDoPeriodo(p.inicio)}
          </text>
        </g>
      ))}
    </>
  );
}

/** O caminho em degraus: um degrau por semana. */
function caminho(progresso: Progresso, { X, Y }: Escalas): string {
  return progresso.porSemana
    .map((n, w) => {
      const x = X(progresso.semanas[w] ?? progresso.inicio).toFixed(1);
      const y = Y(n).toFixed(1);
      return w === 0 ? `M${x} ${y}` : `H${x}V${y}`;
    })
    .join('');
}

/** Metas que chegaram à independência, semana a semana: uma série, em degraus. */
export function GraficoDeIndependencia({ nome, progresso, periodos }: Readonly<PropsDoGrafico>) {
  const { porSemana, inicio, fim } = progresso;
  const topo = Math.max(4, ...porSemana);
  const passo = topo > 8 ? 2 : 1;
  const escalas: Escalas = {
    X: (dia) => X0 + fracaoDaJanela(dia < inicio ? inicio : dia, inicio, fim) * (X1 - X0),
    Y: (n) => Y1 - (n / topo) * (Y1 - Y0),
  };
  const { Y } = escalas;
  const linha = caminho(progresso, escalas);
  const final = porSemana.at(-1) ?? 0;
  const marcas = Array.from({ length: Math.floor(topo / passo) + 1 }, (_, i) => i * passo);
  const de = String(porSemana[0] ?? 0);
  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      role="img"
      aria-label={`Metas que chegaram à independência por semana, de ${formatarData(inicio)} a ${formatarData(fim)}: ${nome} foi de ${de} a ${String(final)}.`}
      className="block h-auto w-full overflow-visible"
    >
      <Eixos marcas={marcas} periodos={periodos} {...escalas} />
      <path
        d={`${linha}H${String(X1)}V${String(Y(0))}H${String(X0)}Z`}
        className="fill-[#5ca8ff]/20"
      />
      <path
        d={`${linha}H${String(X1)}`}
        className="fill-none stroke-[#5ca8ff] stroke-3 [stroke-linejoin:round]"
      />
      <circle
        cx={X1}
        cy={Y(final)}
        r={5.5}
        className="fill-[#5ca8ff] stroke-marinho stroke-[2.5]"
      />
      <text
        x={X1 + 10}
        y={Y(final) + 5}
        className="fill-white font-display text-[17px] font-extrabold"
      >
        {final}
      </text>
    </svg>
  );
}
