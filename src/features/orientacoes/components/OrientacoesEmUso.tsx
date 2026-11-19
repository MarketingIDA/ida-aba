import { X } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import { Button } from '@/components/ui/button';
import type { Orientacao } from '@/features/orientacoes/api/orientacoes.api';
import type { Curadoria } from '@/features/orientacoes/queries';
import { ROTULO_DO_CAMPO } from '@/utils/camposDaIA';
import { dataEHora } from '@/utils/textos';

interface Props {
  orientacoes: readonly Orientacao[];
  curadoria: Curadoria;
}

/** As ativas primeiro; dentro de cada grupo, a ordem do banco (da mais nova para a mais antiga). */
const ativasPrimeiro = (orientacoes: readonly Orientacao[]) =>
  orientacoes.toSorted((a, b) => Number(b.ativa) - Number(a.ativa));

/** Uma orientação: o número, o texto, de onde veio e o botão de retirar ou voltar a usar. */
function Linha({
  orientacao: o,
  numero,
  curadoria,
}: Readonly<{ orientacao: Orientacao; numero: number; curadoria: Curadoria }>) {
  return (
    <li className="flex items-start gap-3.5 border-b border-borda px-5 py-4 last:border-b-0 min-[861px]:px-[22px]">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-lg bg-info-soft text-[0.78rem] font-extrabold text-azul-escuro"
      >
        {numero}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-bold whitespace-pre-line text-marinho">{o.texto}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] font-semibold text-apagado">
          {ROTULO_DO_CAMPO[o.campo]} · aprovada em {dataEHora(o.aprovadaEm)}
          {!o.ativa && <Situacao rotulo="Retirada" tom="neutro" pequena />}
        </span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={curadoria.mudar.isPending}
        aria-label={`${o.ativa ? 'Retirar' : 'Voltar a usar'} a orientação ${String(o.id)}`}
        onClick={() => {
          curadoria.mudar.mutate({ id: o.id, ativa: !o.ativa });
        }}
      >
        {o.ativa && <X aria-hidden="true" />}
        {o.ativa ? 'Retirar' : 'Voltar a usar'}
      </Button>
    </li>
  );
}

/**
 * As orientações (E22): as ativas são lidas pela IA antes de cada rascunho. A retirada deixa de
 * ser lida e pode voltar a ser usada.
 */
export function OrientacoesEmUso({ orientacoes, curadoria }: Readonly<Props>) {
  return (
    <section
      aria-labelledby="orientacoes-em-uso"
      className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-md"
    >
      <div className="border-b border-borda px-5 py-[18px] min-[861px]:px-[22px]">
        <h2 id="orientacoes-em-uso">Orientações da IA</h2>
        <p className="mt-0.5 text-[0.8125rem] text-texto-2">
          A IA lê as orientações ativas antes de gerar cada rascunho, em todas as unidades.
        </p>
      </div>
      {orientacoes.length === 0 ? (
        <p className="px-5 py-4 text-sm text-apagado min-[861px]:px-[22px]">
          Nenhuma orientação ainda. Elas nascem das dicas aprovadas.
        </p>
      ) : (
        <ol aria-label="Orientações da IA">
          {ativasPrimeiro(orientacoes).map((o, i) => (
            <Linha key={o.id} orientacao={o} numero={i + 1} curadoria={curadoria} />
          ))}
        </ol>
      )}
    </section>
  );
}
