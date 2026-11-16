import { Check, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Devolucao } from '@/features/evolucoes/api/devolucao.api';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { devolucaoAberta } from '@/features/evolucoes/conferencia';
import { plural } from '@/features/evolucoes/logica';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucao: Evolucao;
  ocupado: boolean;
  aoResolver: (id: number) => void;
}

interface PropsDoBloqueio {
  devolucao: Devolucao;
  /** O coordenador da carteira resolve; quem só lê vê o motivo e de quem é a vez. */
  podeResolver: boolean;
  ocupado: boolean;
  aoResolver: () => void;
}

/** A devolução em aberto: o motivo, quem devolveu e quando, e "Marcar como resolvida". */
function Bloqueio({ devolucao, podeResolver, ocupado, aoResolver }: Readonly<PropsDoBloqueio>) {
  return (
    <section
      aria-labelledby="devolucao-aberta"
      className="flex flex-col gap-3 rounded-xl border border-bloq-border bg-bloq-soft p-5"
    >
      <h2 id="devolucao-aberta" className="flex items-center gap-2 text-lg text-bloq-text">
        <Undo2 aria-hidden="true" className="size-5 shrink-0" />
        Devolvida pela coordenação geral
      </h2>
      <p className="max-w-[72ch] text-sm font-semibold text-texto">“{devolucao.motivo}”</p>
      <p className="max-w-[72ch] text-caption font-bold text-texto-2">
        {devolucao.devolvidaPor}, {formatarDataHora(devolucao.devolvidaEm)}.{' '}
        {podeResolver
          ? 'Ajuste o que o motivo pede, marque como resolvida e conclua de novo.'
          : 'A evolução só conclui de novo depois de o coordenador marcar como resolvida.'}
      </p>
      {podeResolver && (
        <Button className="self-start" onClick={aoResolver} disabled={ocupado}>
          <Check aria-hidden="true" />
          Marcar como resolvida
        </Button>
      )}
    </section>
  );
}

/** As devoluções que o coordenador já resolveu, recolhidas: ficam como registro. */
function Resolvidas({ devolucoes }: Readonly<{ devolucoes: readonly Devolucao[] }>) {
  return (
    <details className="rounded-xl border border-borda bg-superficie px-5 py-3 text-sm shadow-sm">
      <summary className="cursor-pointer rounded-sm font-bold text-texto-2 foco-anel">
        {plural(devolucoes.length, 'devolução resolvida', 'devoluções resolvidas')}
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
        {devolucoes.map((d) => (
          <li key={d.id} className="flex flex-col gap-0.5">
            <span className="font-semibold text-texto">“{d.motivo}”</span>
            <span className="text-caption font-semibold text-apagado">
              {d.devolvidaPor}, {formatarDataHora(d.devolvidaEm)}
              {d.resolvidaEm !== null &&
                ` · resolvida por ${d.resolvidaPor ?? 'coordenação'} em ${formatarDataHora(d.resolvidaEm)}`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * As devoluções da evolução (E13): a que está em aberto aparece como bloqueio, com o motivo, até
 * o coordenador da carteira marcar como resolvida; as resolvidas ficam recolhidas.
 */
export function DevolucoesDaEvolucao({ evolucao, ocupado, aoResolver }: Readonly<Props>) {
  const aberta = devolucaoAberta(evolucao);
  const resolvidas = evolucao.devolucoes.filter((d) => d.resolvidaEm !== null);
  return (
    <>
      {aberta !== null && (
        <Bloqueio
          devolucao={aberta}
          podeResolver={evolucao.editavel}
          ocupado={ocupado}
          aoResolver={() => {
            aoResolver(aberta.id);
          }}
        />
      )}
      {resolvidas.length > 0 && <Resolvidas devolucoes={resolvidas} />}
    </>
  );
}
