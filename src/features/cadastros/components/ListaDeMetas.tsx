import { Pencil, Target, TriangleAlert } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { Situacao } from '@/components/Situacao';
import { Button } from '@/components/ui/button';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { oQueFaltaNaMeta, SITUACAO_DA_META } from '@/features/cadastros/metas';

/** Uma meta do cadastro, como no protótipo: o programa, a situação, o texto e o critério. */
function LinhaDaMeta({ meta, aoAlterar }: Readonly<{ meta: Meta; aoAlterar?: () => void }>) {
  const { rotulo, tom } = SITUACAO_DA_META[meta.situacao];
  const falta = oQueFaltaNaMeta(meta);
  return (
    <li className="flex flex-col gap-1.5 border-b border-borda px-5 py-4 last:border-b-0 min-[861px]:px-[22px]">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-info-soft px-2 py-px text-[0.72rem] font-extrabold text-azul-escuro lowercase">
          {meta.programa ?? 'sem programa'}
        </span>
        <Situacao rotulo={rotulo} tom={tom} pequena />
      </span>
      <b className="text-[0.90625rem] leading-snug font-extrabold text-marinho">{meta.texto}</b>
      <span className="text-[0.78rem] font-semibold text-apagado">{meta.criterio}</span>
      {falta !== null && (
        <span className="flex items-center gap-1.5 text-[0.78rem] font-bold text-alerta-text">
          <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {falta}
        </span>
      )}
      {aoAlterar !== undefined && (
        <span className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={aoAlterar}>
            <Pencil aria-hidden="true" />
            Alterar
          </Button>
        </span>
      )}
    </li>
  );
}

/** O card "Plano terapêutico": as metas do filtro, ou o convite a cadastrar a primeira. */
export function ListaDeMetas({
  metas,
  semNenhuma,
  titulo,
  aoAlterar,
}: Readonly<{
  metas: readonly Meta[];
  semNenhuma: boolean;
  titulo: string;
  aoAlterar?: (meta: Meta) => void;
}>) {
  return (
    <section className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-md">
      <div className="border-b border-borda px-5 py-[18px] min-[861px]:px-[22px]">
        <h2>{titulo}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-texto-2">
          As metas em desenvolvimento são o ponto de partida das metas para o mês atual. Ao enviar o
          arquivo do mês, as metas alcançadas e as novas atualizam este cadastro.
        </p>
      </div>
      {metas.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icone={Target}
            titulo={semNenhuma ? 'Nenhuma meta cadastrada' : 'Nenhuma meta nesta situação'}
            descricao="As metas em desenvolvimento entram como ponto de partida das metas para o mês atual da evolução."
          />
        </div>
      ) : (
        <ul aria-label="Metas">
          {metas.map((meta) => (
            <LinhaDaMeta
              key={meta.id}
              meta={meta}
              {...(aoAlterar !== undefined && {
                aoAlterar: () => {
                  aoAlterar(meta);
                },
              })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
