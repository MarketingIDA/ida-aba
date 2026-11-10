import { FileText } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { SITUACAO } from '@/features/evolucoes/logica';
import { iniciais } from '@/utils/iniciais';
import { ROTULO_DO_TURNO } from '@/utils/turno';
import { formatarData, formatarMesCurto } from '@dominio/mes.ts';

/** Avatar, mês e código, nome do assistido com a situação e os dados do cadastro. */
export function CabecalhoDaEvolucao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const { rotulo, tom } = SITUACAO[evolucao.situacao];
  const { inicio, fim } = evolucao.periodo;
  const dados = [
    ['Plano', evolucao.plano ?? 'em branco'],
    ['Unidade', `${evolucao.unidade} · ${ROTULO_DO_TURNO[evolucao.turno]}`],
    ['Coordenação', evolucao.coordenador ?? '—'],
    ['Período analisado', `${formatarData(inicio, true)} a ${formatarData(fim)}`],
  ] as const;
  return (
    <header className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="hidden size-14 shrink-0 place-items-center rounded-full bg-info-soft font-display text-xl font-bold text-azul-escuro sm:grid"
      >
        {iniciais(evolucao.assistido)}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2 rotulo text-azul">
          <FileText aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Evolução mensal · {formatarMesCurto(evolucao.mesRef)} ·{' '}
          <span className="font-mono normal-case">{evolucao.codigo}</span>
        </p>
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {evolucao.assistido}
          <Situacao rotulo={rotulo} tom={tom} />
        </h1>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-caption font-semibold text-texto-2">
          {dados.map(([nome, valor]) => (
            <div key={nome} className="flex gap-1.5">
              <dt className="font-extrabold text-apagado">{nome}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
