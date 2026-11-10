import { Lock, OctagonX } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { ROTULO_DO_TURNO } from '@/utils/turno';
import { formatarMesLongo } from '@dominio/mes.ts';

/** Parte 1: os dados do cadastro, como saem no documento. Não se edita aqui. */
export function Identificacao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const itens: [string, ReactNode][] = [
    ['Nome do profissional', evolucao.coordenador ?? '—'],
    ['Unidade', evolucao.unidade],
    ['Turno', ROTULO_DO_TURNO[evolucao.turno]],
    ['Especialidade', 'ABA'],
    ['Mês/ano', formatarMesLongo(evolucao.mesRef)],
    ['Nome do assistido', evolucao.assistido.toLocaleUpperCase('pt-BR')],
    [
      'Plano de saúde',
      evolucao.plano ?? (
        <span className="inline-flex items-center gap-1 text-bloq-text">
          <OctagonX aria-hidden="true" className="size-3.5" />
          em branco no cadastro
        </span>
      ),
    ],
  ];
  return (
    <>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-caption font-bold text-apagado">{rotulo}</dt>
            <dd className="text-sm font-semibold text-marinho">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex items-center gap-1.5 text-caption font-semibold text-apagado">
        <Lock aria-hidden="true" className="size-3.5 shrink-0" />
        Os dados vêm do cadastro. Para corrigir, fale com a coordenação geral.
      </p>
    </>
  );
}
