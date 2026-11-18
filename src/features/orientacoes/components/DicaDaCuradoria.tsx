import { Situacao } from '@/components/Situacao';
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

/** Uma dica na curadoria: o campo, quem sugeriu, a dica, o que a IA tinha escrito e a decisão. */
export function DicaDaCuradoria({
  dica,
  curadoria,
}: Readonly<{ dica: Dica; curadoria: Curadoria }>) {
  const { rotulo, tom } = SITUACAO_DA_DICA[dica.situacao];
  const ocupado = curadoria.aprovar.isPending || curadoria.descartar.isPending;
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <b className="text-sm text-marinho">{ROTULO_DO_CAMPO[dica.campo]}</b>
        <Situacao rotulo={rotulo} tom={tom} />
        <span className="text-caption font-semibold text-apagado">
          Sugerida por {dica.criadoPor} em {dataEHora(dica.criadoEm)}
        </span>
      </div>
      <p className="max-w-[75ch] text-sm font-semibold whitespace-pre-line text-texto">
        {dica.dica}
      </p>
      <details className="max-w-[75ch] text-sm">
        <summary className="cursor-pointer rounded-sm text-caption font-bold text-azul foco-anel">
          O que a IA tinha escrito
        </summary>
        <p className="mt-2 whitespace-pre-line text-texto-2">
          {dica.textoOriginal === '' ? 'A IA deixou este bloco em branco.' : dica.textoOriginal}
        </p>
      </details>
      {dica.situacao === 'pendente' ? (
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
        <p className="text-caption font-bold text-texto-2">{decisaoDa(dica)}</p>
      )}
    </li>
  );
}
