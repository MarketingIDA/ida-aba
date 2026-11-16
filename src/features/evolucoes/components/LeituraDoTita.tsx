import { OctagonX, TriangleAlert } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import type { AnaliseLida, Conferencia, Favorecido } from '@/features/evolucoes/tita/leitura';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';

/** O bloco "Dados do Favorecido" como o sistema leu (E02). */
export function DadosDoFavorecido({ favorecido }: Readonly<{ favorecido: Favorecido }>) {
  const periodo = `${formatarData(favorecido.periodoInicio, true)} a ${formatarData(favorecido.periodoFim)}`;
  const itens = [
    ['Nome', favorecido.nome],
    ['Idade', favorecido.idade],
    ['Gênero', favorecido.genero],
    ['Terapias', favorecido.terapias],
    ['Profissionais', favorecido.profissionais],
    ['Período avaliado', periodo],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="contents">
          <dt className="text-caption font-bold text-apagado">{rotulo}</dt>
          <dd className="text-sm font-semibold text-marinho">{valor === '' ? '—' : valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "13 sessões e 2 faltas no período analisado · frequência de 87%" (E04). */
export function textoDaFrequencia(noPeriodo: readonly AnaliseLida[]): string {
  const faltas = noPeriodo.filter((a) => a.falta).length;
  const sessoes = noPeriodo.length - faltas;
  const frequencia = noPeriodo.length === 0 ? 0 : Math.round((sessoes / noPeriodo.length) * 100);
  return `${plural(sessoes, 'sessão', 'sessões')} e ${plural(faltas, 'falta', 'faltas')} no período analisado · frequência de ${String(frequencia)}%`;
}

/** O que impede a importação (E03) e o que o coordenador confere no Tita (E03, E19). */
export function AvisosDaLeitura({
  bloqueios,
  alertas,
}: Readonly<Pick<Conferencia, 'bloqueios' | 'alertas'>>) {
  if (bloqueios.length === 0 && alertas.length === 0) return null;
  return (
    <ul aria-label="Conferências da leitura" className="flex flex-col gap-2">
      {bloqueios.map((texto) => (
        <li
          key={texto}
          className="flex items-start gap-2 rounded-xl border border-bloq-border bg-bloq-soft px-4 py-2.5 text-sm font-semibold text-bloq-text"
        >
          <OctagonX aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Bloqueio: </span>
            {texto}
          </span>
        </li>
      ))}
      {alertas.map((texto) => (
        <li
          key={texto}
          className="flex items-start gap-2 rounded-xl border border-alerta-border bg-alerta-soft px-4 py-2.5 text-sm font-semibold text-alerta-text"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Alerta: </span>
            {texto}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** As análises do atendimento do período, uma por evolução diária, para consultar ao escrever. */
export function AnalisesDoTita({ analises }: Readonly<{ analises: readonly AnaliseLida[] }>) {
  return (
    <details className="rounded-xl border border-borda bg-superficie">
      <summary className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-azul foco-anel">
        Ver {plural(analises.length, 'análise do atendimento', 'análises do atendimento')}
      </summary>
      <ol className="flex flex-col divide-y divide-borda px-4 pb-2">
        {analises.map((analise, i) => (
          // A mesma data pode ter mais de uma evolução diária: a posição desempata.
          <li key={`${analise.data}-${String(i)}`} className="flex flex-col gap-1 py-2.5">
            <span className="flex items-center gap-2 text-caption font-bold text-marinho">
              {formatarData(analise.data)}
              {analise.falta && <Situacao rotulo="Falta" tom="neutro" />}
            </span>
            <p className="text-sm text-texto-2">
              {analise.texto === '' ? 'Sem análise registrada.' : analise.texto}
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
}
