import { Check, OctagonX, Send } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import { NUMEROS, TITULO_DA_PARTE } from '@/features/evolucoes/conferencia';
import { irParaParte, type ResumoDaConferencia } from '@/features/evolucoes/resumo';
import { cn } from '@/lib/utils';

const BOLA =
  'grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-borda-forte bg-white text-xs';
/** O traço entre as etapas (o `li+li::before` do protótipo). */
const TRACO =
  "[&+&]:before:mr-0.5 [&+&]:before:h-0.5 [&+&]:before:w-[22px] [&+&]:before:rounded-sm [&+&]:before:bg-borda-forte [&+&]:before:content-['']";

/** O que vai na bola da parte: o visto, o bloqueio ou o número. */
function marcaDaParte(n: NumeroDaParte, feita: boolean, bloqueio: boolean): ReactNode {
  if (feita) return <Check aria-hidden="true" className="size-3.5" />;
  return bloqueio ? <OctagonX aria-hidden="true" className="size-3" /> : <>{n}</>;
}

function sufixo(feita: boolean, bloqueio: boolean): string {
  if (feita) return '(conferida)';
  return bloqueio ? '(com bloqueio)' : '';
}

function Bola({
  feita,
  bloqueio,
  conteudo,
}: Readonly<{ feita: boolean; bloqueio: boolean; conteudo: ReactNode }>) {
  return (
    <span
      className={cn(
        BOLA,
        feita && 'border-ok bg-ok text-marinho',
        !feita && bloqueio && 'border-bloq-border bg-bloq-soft text-bloq-ic',
        'group-aria-[current=step]:border-azul group-aria-[current=step]:text-azul group-aria-[current=step]:shadow-[0_0_0_4px_var(--info-soft)]',
      )}
    >
      {conteudo}
    </span>
  );
}

const ETAPA =
  'group flex items-center gap-2 text-[0.84375rem] font-extrabold text-apagado aria-[current=step]:text-info-text';

/** Uma parte nas etapas: tocar leva a ela; só a atual mostra o nome. */
function EtapaDaParte({
  n,
  feita,
  bloqueio,
  atual,
}: Readonly<{ n: NumeroDaParte; feita: boolean; bloqueio: boolean; atual: boolean }>) {
  return (
    <li
      aria-current={atual ? 'step' : undefined}
      className={cn(ETAPA, feita && 'text-texto-2', TRACO)}
    >
      <button
        type="button"
        onClick={() => {
          irParaParte(n);
        }}
        className="flex cursor-pointer items-center gap-2 rounded-[10px] foco-anel"
      >
        <Bola feita={feita} bloqueio={bloqueio} conteudo={marcaDaParte(n, feita, bloqueio)} />
        <span className={cn(!atual && 'sr-only')}>
          {TITULO_DA_PARTE[n]} <span className="sr-only">{sufixo(feita, bloqueio)}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * As etapas da evolução, como no protótipo: as 4 partes (feita, com bloqueio ou a conferir) e o
 * arquivo do mês. A etapa atual mostra o nome; tocar numa parte leva a ela.
 */
export function EtapasDaEvolucao({
  evolucao,
  resumo,
}: Readonly<{ evolucao: Evolucao; resumo: ResumoDaConferencia }>) {
  const emConferencia = evolucao.situacao === 'em_conferencia';
  const feita = (n: NumeroDaParte) =>
    evolucao.partes.some((p) => p.numero === n && p.conferidaEm !== null);
  const enviada = evolucao.situacao === 'enviada';
  return (
    <ol aria-label="Etapas da evolução" className="mt-3.5 flex flex-wrap items-center gap-1.5">
      {NUMEROS.map((n) => (
        <EtapaDaParte
          key={n}
          n={n}
          feita={feita(n)}
          bloqueio={resumo.comBloqueio.includes(n)}
          atual={emConferencia && resumo.aConferir === n}
        />
      ))}
      <li
        aria-current={evolucao.situacao === 'concluida' ? 'step' : undefined}
        className={cn(ETAPA, enviada && 'text-texto-2', TRACO)}
      >
        <Bola
          feita={enviada}
          bloqueio={false}
          conteudo={
            enviada ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : (
              <Send aria-hidden="true" className="size-3" />
            )
          }
        />
        <span className={cn(evolucao.situacao !== 'concluida' && 'sr-only')}>
          {enviada ? 'Enviada' : 'Arquivo do mês'}
        </span>
      </li>
    </ol>
  );
}
