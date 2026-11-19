import { nomeDoNivel } from '@/features/progresso/textos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/textos';
import { formatarData, nomeDoMes } from '@dominio/mes.ts';
import type { AnaliseDaMeta, SemanaDaMeta } from '@dominio/progresso.ts';

/** A rampa de azuis do protótipo: quanto mais sessões na semana, mais escuro. */
const TOM = [
  'bg-superficie-2 shadow-[inset_0_0_0_1px_var(--borda)]',
  'bg-[#86b5ff]',
  'bg-[#3d89ff]',
  'bg-[#0060e6]',
  'bg-[#003d99]',
];

/** A bolinha branca de contorno marinho: a semana em que a meta chegou à independência. */
const INDEPENDENTE =
  "after:absolute after:top-1/2 after:left-1/2 after:-translate-1/2 after:rounded-full after:bg-white after:shadow-[0_0_0_2px_var(--ida-marinho)] after:content-['']";

function Celula({
  semana,
  inicio,
  programa,
}: Readonly<{ semana: SemanaDaMeta; inicio: string; programa: string }>) {
  const niveis = semana.niveis.map((n) => nomeDoNivel(n).toLowerCase()).join(', ');
  const titulo = [
    `${programa} · semana de ${formatarData(inicio, true)}`,
    semana.sessoes === 0 ? 'não trabalhado' : plural(semana.sessoes, 'sessão', 'sessões'),
    semana.sessoes > 0 && (niveis === '' ? 'sem nível' : `níveis: ${niveis}`),
    semana.independente && 'chegou à independência',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <span
      title={titulo}
      className={cn(
        'relative h-[26px] rounded-[6px] hover:outline-2 hover:outline-offset-1 hover:outline-marinho',
        TOM[Math.min(semana.sessoes, 4)],
        semana.independente && `${INDEPENDENTE} after:size-2`,
      )}
    />
  );
}

/** O mês de cada semana pela quarta-feira dela, agrupado: `[['agosto', 4], ['setembro', 5]]`. */
function mesesDasSemanas(semanas: readonly string[]): [string, number][] {
  const grupos: [string, number][] = [];
  for (const inicio of semanas) {
    const quarta = new Date(`${inicio}T12:00:00Z`);
    quarta.setUTCDate(quarta.getUTCDate() + 2);
    const mes = nomeDoMes(`${quarta.toISOString().slice(0, 7)}-01`);
    const ultimo = grupos.at(-1);
    if (ultimo?.[0] === mes) ultimo[1] += 1;
    else grupos.push([mes, 1]);
  }
  return grupos;
}

function Linha({
  analise,
  semanas,
}: Readonly<{ analise: AnaliseDaMeta; semanas: readonly string[] }>) {
  const programa = analise.meta.programa ?? 'sem programa';
  return (
    <>
      <span
        className="sticky left-0 z-[1] truncate bg-superficie pr-2.5 text-[0.78rem] leading-[26px] font-extrabold text-marinho"
        title={programa}
      >
        {programa}
      </span>
      {analise.semanas.map((semana, w) => (
        <Celula
          key={semanas[w] ?? w}
          semana={semana}
          inicio={semanas[w] ?? ''}
          programa={programa}
        />
      ))}
    </>
  );
}

/** A legenda do mapa, no alto do card, como no protótipo. */
export function LegendaDoMapa() {
  return (
    <p
      aria-hidden="true"
      className="flex flex-wrap items-center gap-[5px] text-xs font-bold text-apagado"
    >
      Sessões na semana
      {TOM.map((tom, n) => (
        <span key={tom} className="inline-flex items-center gap-[5px]">
          <span className={cn('ml-1.5 inline-block h-3.5 w-4 rounded-[4px]', tom)} />
          {n === 4 ? '4+' : n}
        </span>
      ))}
      <span className="inline-flex items-center gap-[5px]">
        <span
          className={cn(
            'relative ml-1.5 inline-block h-3.5 w-4 rounded-[4px]',
            TOM[3],
            INDEPENDENTE,
            'after:size-1.5',
          )}
        />
        independente
      </span>
    </p>
  );
}

/** Quantas sessões por semana trabalharam cada meta; os números estão na versão em tabela. */
export function MapaDeSessoes({
  metas,
  semanas,
}: Readonly<{ metas: readonly AnaliseDaMeta[]; semanas: readonly string[] }>) {
  const comSessao = metas.filter((x) => x.pontos.length > 0);
  if (comSessao.length === 0) {
    return (
      <p className="text-sm text-texto-2">As metas deste filtro não aparecem nas análises lidas.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div
        role="img"
        aria-label="Sessões por semana em que cada meta foi trabalhada; os números estão na versão em tabela."
        className="grid min-w-[560px] items-center gap-1"
        style={{
          gridTemplateColumns: `minmax(140px, 230px) repeat(${String(semanas.length)}, minmax(24px, 1fr))`,
        }}
      >
        <span className="mb-0.5 border-b border-borda" />
        {mesesDasSemanas(semanas).map(([mes, n]) => (
          <span
            key={mes}
            className="mb-0.5 truncate border-b border-borda px-0.5 pb-1.5 rotulo tracking-[0.08em] text-apagado"
            style={{ gridColumn: `span ${String(n)}` }}
          >
            {mes}
          </span>
        ))}
        {comSessao.map((x) => (
          <Linha key={x.meta.id} analise={x} semanas={semanas} />
        ))}
      </div>
    </div>
  );
}
