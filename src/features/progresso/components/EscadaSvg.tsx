import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import { mesDoPeriodo, NIVEL_CURTO, nomeDoNivel } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';
import { type AnaliseDaMeta, fracaoDaJanela, type Progresso } from '@dominio/progresso.ts';

const W = 320;
const H = 142;
const L = 70;
const R = 308;
const T = 18;
const B = 104;
const F = 122;
const Y = (nivel: number) => B - ((nivel - 1) * (B - T)) / 4;
const EIXO = 'fill-apagado text-[9.5px] font-bold';

export interface PropsDaEscada {
  analise: AnaliseDaMeta;
  progresso: Progresso;
  periodos: readonly PeriodoDaEvolucao[];
}

/** A descrição para leitores de tela: quantas sessões, de que degrau a que degrau. */
function descricao(analise: AnaliseDaMeta): string {
  const de = nomeDoNivel(analise.primeiro?.nivel ?? null).toLowerCase();
  const ate = nomeDoNivel(analise.ultimo?.nivel ?? null).toLowerCase();
  const sessoes = plural(analise.pontos.length, 'sessão', 'sessões');
  if (analise.independente === null) return `${sessoes}, de ${de} a ${ate}.`;
  const quando = formatarData(analise.independente.data, true);
  return `${sessoes}, de ${de} a ${ate}, independente em ${quando}.`;
}

/** O caminho em degraus pelos pontos com nível. */
function caminho(analise: AnaliseDaMeta, X: (dia: string) => number): string {
  return analise.comNivel
    .map((p, i) => {
      const x = X(p.data).toFixed(1);
      const y = String(Y(p.nivel ?? 1));
      return i === 0 ? `M${x} ${y}` : `H${x}V${y}`;
    })
    .join('');
}

function Eixos({
  periodos,
  X,
}: Readonly<{ periodos: readonly PeriodoDaEvolucao[]; X: (dia: string) => number }>) {
  return (
    <>
      {NIVEL_CURTO.map((nome, i) => (
        <g key={nome}>
          <line x1={L} x2={R} y1={Y(i + 1)} y2={Y(i + 1)} className="stroke-borda" />
          <text x={L - 7} y={Y(i + 1) + 3} textAnchor="end" className={EIXO}>
            {nome}
          </text>
        </g>
      ))}
      <text x={L - 7} y={F + 3} textAnchor="end" className={EIXO}>
        sem nível
      </text>
      {periodos.map((p) => (
        <g key={p.evolucaoId}>
          <line
            x1={X(p.inicio)}
            x2={X(p.inicio)}
            y1={T - 8}
            y2={F + 6}
            className="stroke-borda-forte"
          />
          <text x={(X(p.inicio) + X(p.fim)) / 2} y={H - 2} textAnchor="middle" className={EIXO}>
            {mesDoPeriodo(p.inicio).slice(0, 3)}
          </text>
        </g>
      ))}
    </>
  );
}

/** A escada de uma meta: um ponto por dia de sessão, do degrau de mais apoio até independente. */
export function EscadaSvg({ analise, progresso, periodos }: Readonly<PropsDaEscada>) {
  const X = (dia: string) => L + fracaoDaJanela(dia, progresso.inicio, progresso.fim) * (R - L);
  const linha = caminho(analise, X);
  const inicio = analise.comNivel[0];
  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      role="img"
      aria-label={descricao(analise)}
      className="block h-auto w-full overflow-visible"
    >
      <Eixos periodos={periodos} X={X} />
      {inicio !== undefined && (
        <>
          <path
            d={`${linha}V${String(B)}H${X(inicio.data).toFixed(1)}Z`}
            className="fill-azul/10"
          />
          <path d={linha} className="fill-none stroke-azul stroke-2 [stroke-linejoin:round]" />
        </>
      )}
      {analise.pontos.map((p) => (
        <circle
          key={`${p.data}-${String(p.nivel)}`}
          cx={X(p.data)}
          cy={p.nivel === null ? F : Y(p.nivel)}
          r={p.nivel === null ? 3 : 4}
          className={
            p.nivel === null
              ? 'fill-superficie stroke-tenue stroke-[1.5]'
              : 'fill-azul stroke-superficie stroke-2'
          }
        >
          <title>{`${formatarData(p.data, true)} · ${nomeDoNivel(p.nivel)}: ${p.trecho}`}</title>
        </circle>
      ))}
    </svg>
  );
}
