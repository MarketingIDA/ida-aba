import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';

import { Situacao } from '@/components/Situacao';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import { devolucaoAberta } from '@/features/evolucoes/conferencia';
import { plural, SITUACAO } from '@/features/evolucoes/logica';
import { formatarDataHora } from '@/features/evolucoes/textos';
import { iniciais } from '@/utils/iniciais';
import { ROTULO_DO_TURNO } from '@/utils/turno';
import { formatarData, formatarMesCurto } from '@dominio/mes.ts';

interface Props {
  evolucao: Evolucao;
  /** A importação atual do PDF do Tita, ou `null`. */
  importacao: Importacao | null;
  documentos: number;
  /** Abaixo dos dados: as etapas da evolução. */
  children?: ReactNode;
}

/** "importado em 04/11 às 10:15 · 12 evoluções diárias, 1 fora do período" */
function textoDoTita(importacao: Importacao, inicio: string, fim: string): string {
  const fora = importacao.analises.filter((a) => a.data < inicio || a.data > fim).length;
  const total = plural(importacao.analises.length, 'evolução diária', 'evoluções diárias');
  const deFora = fora > 0 ? `, ${String(fora)} fora do período` : '';
  return `importado em ${formatarDataHora(importacao.importadoEm)} · ${total}${deFora}`;
}

/** Os dados abaixo do nome: cadastro, período e, se houver, o Tita, os documentos e a escrita à mão. */
function dadosDa({ evolucao, importacao, documentos }: Props): (readonly [string, string])[] {
  const { inicio, fim } = evolucao.periodo;
  return [
    ['Plano', evolucao.plano ?? 'em branco'],
    ['Unidade', `${evolucao.unidade} · ${ROTULO_DO_TURNO[evolucao.turno]}`],
    ['Coordenação', evolucao.coordenador ?? '—'],
    ['Período analisado', `${formatarData(inicio, true)} a ${formatarData(fim)}`],
    ...(importacao === null ? [] : [['Tita', textoDoTita(importacao, inicio, fim)] as const]),
    ...(documentos > 0 ? [['Documentos', String(documentos)] as const] : []),
    ...(evolucao.origem === 'manual' ? [['Escrita à mão', 'sem o PDF do Tita'] as const] : []),
  ];
}

/** Avatar, mês e código, nome do assistido com a situação (e a devolução), os dados e as etapas. */
export function CabecalhoDaEvolucao(props: Readonly<Props>) {
  const { evolucao } = props;
  const { rotulo, tom } = SITUACAO[evolucao.situacao];
  const dados = dadosDa(props);
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
          {devolucaoAberta(evolucao) !== null && <Situacao rotulo="Devolvida" tom="bloq" />}
        </h1>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-caption font-semibold text-texto-2">
          {dados.map(([nome, valor]) => (
            <div key={nome} className="flex gap-1.5">
              <dt className="font-extrabold text-apagado">{nome}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
        {props.children}
      </div>
    </header>
  );
}
