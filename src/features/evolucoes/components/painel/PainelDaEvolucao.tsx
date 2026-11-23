import { type KeyboardEvent, type ReactNode, useId, useState } from 'react';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import {
  AnteriorDoPainel,
  rotuloDoAnterior,
} from '@/features/evolucoes/components/painel/AnteriorDoPainel';
import { ConferenciasDoPainel } from '@/features/evolucoes/components/painel/ConferenciasDoPainel';
import { conferenciasAbertas } from '@/features/evolucoes/components/painel/conferencias';
import { FontesDoPainel } from '@/features/evolucoes/components/painel/FontesDoPainel';
import { HistoricoDoPainel } from '@/features/evolucoes/components/painel/HistoricoDoPainel';
import type { ContextoDaConferencia } from '@/features/evolucoes/conferencia';
import { cn } from '@/lib/utils';

type Aba = 'conferencias' | 'fontes' | 'anterior' | 'historico';
const ABAS: readonly Aba[] = ['conferencias', 'fontes', 'anterior', 'historico'];

interface Props {
  evolucao: Evolucao;
  contexto: ContextoDaConferencia;
  importacao: Importacao | null;
}

/** As setas, Home e End trocam de aba, como pede o padrão de abas (WAI-ARIA). */
function abaDaTecla(tecla: string, atual: Aba): Aba | null {
  const i = ABAS.indexOf(atual);
  const passo: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1 + ABAS.length };
  if (tecla === 'Home') return ABAS[0] ?? null;
  if (tecla === 'End') return ABAS.at(-1) ?? null;
  const destino = passo[tecla];
  return destino === undefined ? null : (ABAS[destino % ABAS.length] ?? null);
}

interface PropsDasAbas {
  id: string;
  aba: Aba;
  nomes: Record<Aba, string>;
  abertas: number;
  bloqueio: boolean;
  aoEscolher: (aba: Aba) => void;
}

/** As abas do painel (o `.tabs.lado` do protótipo), com a contagem das conferências abertas. */
function Abas({ id, aba, nomes, abertas, bloqueio, aoEscolher }: Readonly<PropsDasAbas>) {
  const aoTeclar = (evento: KeyboardEvent) => {
    const destino = abaDaTecla(evento.key, aba);
    if (destino === null) return;
    evento.preventDefault();
    aoEscolher(destino);
    document.getElementById(`${id}-${destino}`)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Apoio"
      className="flex w-full justify-between gap-[3px] overflow-x-auto rounded-full border border-borda bg-white p-[5px] shadow-sm"
    >
      {ABAS.map((a) => (
        <button
          key={a}
          id={`${id}-${a}`}
          type="button"
          role="tab"
          aria-selected={aba === a}
          aria-controls={`${id}-painel`}
          tabIndex={aba === a ? 0 : -1}
          onKeyDown={aoTeclar}
          onClick={() => {
            aoEscolher(a);
          }}
          className={cn(
            'inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-[5px] rounded-full px-2 text-[0.78125rem] font-extrabold whitespace-nowrap foco-anel transition-colors',
            aba === a ? 'bg-azul text-white' : 'text-apagado',
          )}
        >
          {nomes[a]}
          {a === 'conferencias' && abertas > 0 && (
            <span
              className={cn(
                'rounded-full px-2 py-px text-[0.71875rem]',
                bloqueio ? 'bg-bloq-soft text-bloq-text' : 'bg-alerta-soft text-alerta-text',
              )}
            >
              {abertas}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * O painel ao lado das partes (o `.evo-lado` do protótipo): as conferências abertas, as fontes, o mês
 * anterior e o histórico, uma aba por vez.
 */
export function PainelDaEvolucao({ evolucao, contexto, importacao }: Readonly<Props>) {
  const [aba, setAba] = useState<Aba>('conferencias');
  const id = useId();
  const abertas = conferenciasAbertas(evolucao, contexto, importacao);
  const nomes: Record<Aba, string> = {
    conferencias: 'Conferências',
    fontes: 'Fontes',
    anterior: rotuloDoAnterior(contexto.anterior ?? null),
    historico: 'Histórico',
  };
  return (
    <aside
      aria-label="Apoio à conferência"
      className="-m-1 flex [scrollbar-width:thin] flex-col gap-2.5 p-1 max-[1100px]:order-first min-[1101px]:sticky min-[1101px]:top-[106px] min-[1101px]:max-h-[calc(100dvh-206px)] min-[1101px]:overflow-y-auto [&>*]:shrink-0"
    >
      <Abas
        id={id}
        aba={aba}
        nomes={nomes}
        abertas={abertas.length}
        bloqueio={abertas.some((c) => c.tom === 'bloq')}
        aoEscolher={setAba}
      />
      <div role="tabpanel" id={`${id}-painel`} aria-labelledby={`${id}-${aba}`}>
        {aba === 'conferencias' && (
          <ConferenciasDoPainel evolucao={evolucao} importacao={importacao} abertas={abertas} />
        )}
        {aba === 'fontes' && <FontesDoPainel evolucao={evolucao} importacao={importacao} />}
        {aba === 'anterior' && (
          <AnteriorDoPainel evolucao={evolucao} anterior={contexto.anterior ?? null} />
        )}
        {aba === 'historico' && <HistoricoDoPainel evolucao={evolucao} />}
      </div>
    </aside>
  );
}

/** As partes e o painel lado a lado (o `.evo-grid` do protótipo); abaixo de 1100px, o painel vem antes. */
export function GradeDaEvolucao({ children, ...props }: Readonly<Props & { children: ReactNode }>) {
  return (
    <div className="grid grid-cols-1 items-start gap-5 min-[1101px]:grid-cols-[minmax(0,1fr)_340px] min-[1431px]:grid-cols-[minmax(0,1fr)_370px] [&>*]:min-w-0">
      <div className="flex flex-col gap-5">{children}</div>
      <PainelDaEvolucao {...props} />
    </div>
  );
}
