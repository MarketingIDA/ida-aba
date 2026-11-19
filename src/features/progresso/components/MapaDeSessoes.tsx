import { nomeDoNivel } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';
import type { AnaliseDaMeta, SemanaDaMeta } from '@dominio/progresso.ts';

/** A rampa de um tom só: quanto mais sessões na semana, mais escuro. */
const TOM = ['bg-superficie-2', 'bg-azul/25', 'bg-azul/45', 'bg-azul/70', 'bg-azul'];

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
      className={`h-5 rounded-[4px] ${TOM[Math.min(semana.sessoes, 4)] ?? ''} ${semana.independente ? 'ring-2 ring-verde ring-inset' : ''}`}
    />
  );
}

function Linha({
  analise,
  semanas,
}: Readonly<{ analise: AnaliseDaMeta; semanas: readonly string[] }>) {
  const programa = analise.meta.programa ?? 'sem programa';
  return (
    <>
      <span className="truncate pr-2 text-caption font-bold text-marinho" title={programa}>
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

function Legenda() {
  return (
    <p
      aria-hidden="true"
      className="mt-3 flex flex-wrap items-center gap-2 text-caption font-bold text-apagado"
    >
      Sessões na semana
      {TOM.map((tom, n) => (
        <span key={tom} className="inline-flex items-center gap-1">
          <span className={`inline-block size-3 rounded-[3px] ${tom}`} />
          {n === 4 ? '4+' : n}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-[3px] ring-2 ring-verde ring-inset" />
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
          gridTemplateColumns: `minmax(110px, 160px) repeat(${String(semanas.length)}, minmax(0, 1fr))`,
        }}
      >
        {comSessao.map((x) => (
          <Linha key={x.meta.id} analise={x} semanas={semanas} />
        ))}
      </div>
      <Legenda />
    </div>
  );
}
