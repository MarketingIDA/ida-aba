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

/**
 * As orientações (E22): as ativas são lidas pela IA antes de cada rascunho. A retirada deixa de
 * ser lida e pode voltar a ser usada.
 */
export function OrientacoesEmUso({ orientacoes, curadoria }: Readonly<Props>) {
  return (
    <section aria-labelledby="orientacoes-em-uso" className="flex flex-col gap-3">
      <div className="flex max-w-[72ch] flex-col gap-1">
        <h2 id="orientacoes-em-uso">Orientações</h2>
        <p className="text-sm font-semibold text-texto-2">
          A IA lê as orientações ativas antes de gerar cada rascunho, em todas as unidades.
        </p>
      </div>
      {orientacoes.length === 0 ? (
        <p className="text-sm text-apagado">
          Nenhuma orientação ainda. Elas nascem das dicas aprovadas.
        </p>
      ) : (
        <ul
          aria-label="Orientações da IA"
          className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
        >
          {ativasPrimeiro(orientacoes).map((o) => (
            <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <b className="text-sm text-marinho">{ROTULO_DO_CAMPO[o.campo]}</b>
                  {!o.ativa && <Situacao rotulo="Retirada" tom="neutro" />}
                  <span className="text-caption font-semibold text-apagado">
                    Aprovada em {dataEHora(o.aprovadaEm)}
                  </span>
                </span>
                <span className="max-w-[75ch] text-sm whitespace-pre-line text-texto">
                  {o.texto}
                </span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={curadoria.mudar.isPending}
                aria-label={`${o.ativa ? 'Retirar' : 'Voltar a usar'} a orientação ${String(o.id)}`}
                onClick={() => {
                  curadoria.mudar.mutate({ id: o.id, ativa: !o.ativa });
                }}
              >
                {o.ativa ? 'Retirar' : 'Voltar a usar'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
