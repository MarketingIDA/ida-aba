import { Situacao } from '@/components/Situacao';
import { cn } from '@/lib/utils';
import type { Dica, SituacaoDaDica } from '@/features/orientacoes/api/orientacoes.api';
import { DecisaoDaDica } from '@/features/orientacoes/components/DecisaoDaDica';
import type { Curadoria } from '@/features/orientacoes/queries';
import { ROTULO_DO_CAMPO } from '@/utils/camposDaIA';
import { dataEHora } from '@/utils/textos';

/** Rótulo e cor de cada situação da dica. */
export const SITUACAO_DA_DICA: Record<
  SituacaoDaDica,
  { rotulo: string; plural: string; tom: 'alerta' | 'ok' | 'neutro' }
> = {
  pendente: { rotulo: 'Pendente', plural: 'Pendentes', tom: 'alerta' },
  aprovada: { rotulo: 'Aprovada', plural: 'Aprovadas', tom: 'ok' },
  descartada: { rotulo: 'Descartada', plural: 'Descartadas', tom: 'neutro' },
};

/** Quem decidiu e quando; no descarte, o motivo, se houve. */
function decisaoDa(dica: Dica): string {
  const quando = dica.decididaEm === null ? '' : ` em ${dataEHora(dica.decididaEm)}`;
  const quem = `${SITUACAO_DA_DICA[dica.situacao].rotulo} por ${dica.decididaPor ?? 'coordenação geral'}${quando}.`;
  return dica.motivo === null ? quem : `${quem} Motivo: ${dica.motivo}`;
}

const COLUNA = 'flex min-w-0 flex-col gap-1.5';
const TITULO_DA_COLUNA = 'rotulo text-apagado';

/** As duas colunas do protótipo: o que a IA tinha escrito e a dica. */
function TextoEDica({ dica }: Readonly<{ dica: Dica }>) {
  return (
    <div className="grid gap-4 min-[861px]:grid-cols-2 min-[861px]:gap-6">
      <div className={COLUNA}>
        <p className={TITULO_DA_COLUNA}>Texto original da IA</p>
        <p className="border-l-2 border-borda-forte pl-3 text-[0.8125rem] whitespace-pre-line text-texto-2">
          {dica.textoOriginal === '' ? 'A IA deixou este bloco em branco.' : dica.textoOriginal}
        </p>
      </div>
      <div className={COLUNA}>
        <p className={TITULO_DA_COLUNA}>Dica</p>
        <p className="border-l-2 border-azul pl-3 text-sm font-bold whitespace-pre-line text-marinho">
          {dica.dica}
        </p>
      </div>
    </div>
  );
}

/** Uma dica na curadoria: o campo, quem sugeriu, o texto da IA, a dica e a decisão. */
export function DicaDaCuradoria({
  dica,
  curadoria,
}: Readonly<{ dica: Dica; curadoria: Curadoria }>) {
  const { rotulo, tom } = SITUACAO_DA_DICA[dica.situacao];
  const ocupado = curadoria.aprovar.isPending || curadoria.descartar.isPending;
  const pendente = dica.situacao === 'pendente';
  return (
    <li
      className={cn(
        'flex flex-col gap-3 border-b border-borda px-5 py-4 last:border-b-0 min-[861px]:px-[22px]',
        pendente && 'bg-[linear-gradient(90deg,var(--alerta-soft),transparent_70%)]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <b className="flex items-center gap-2 text-sm text-marinho">
            <span
              aria-hidden="true"
              className="grid size-[22px] place-items-center rounded-full border border-info-border bg-info-soft font-serif text-xs font-bold text-azul italic"
            >
              i
            </span>
            {ROTULO_DO_CAMPO[dica.campo]}
          </b>
          <span className="text-[0.78rem] font-semibold text-apagado">
            {dica.criadoPor} · {dataEHora(dica.criadoEm)}
          </span>
        </div>
        <Situacao rotulo={rotulo} tom={tom} pequena />
      </div>
      <TextoEDica dica={dica} />
      {pendente ? (
        <DecisaoDaDica
          dica={dica}
          ocupado={ocupado}
          aoAprovar={(texto) => {
            curadoria.aprovar.mutate({ id: dica.id, texto });
          }}
          aoDescartar={(motivo) => {
            curadoria.descartar.mutate({ id: dica.id, motivo });
          }}
        />
      ) : (
        <p className="text-[0.78rem] font-semibold text-apagado">{decisaoDa(dica)}</p>
      )}
    </li>
  );
}
