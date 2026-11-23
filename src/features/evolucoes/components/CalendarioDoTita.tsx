import { useQuery } from '@tanstack/react-query';

import { diasJaAnalisadosOptions } from '@/features/evolucoes/api/diasAnalisados.api';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import { cn } from '@/lib/utils';
import {
  type DataDeFora,
  type DiaDoCalendario,
  datasDeFora,
  semanasDoPeriodo,
} from '@dominio/calendario.ts';
import { formatarData, nomeDoMes } from '@dominio/mes.ts';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOME_DO_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const COR: Record<DiaDoCalendario['situacao'], string> = {
  sessao: 'bg-ok-soft text-ok-text font-bold',
  falta: 'bg-alerta-soft text-alerta-text font-bold',
  sem: 'text-apagado',
};

function rotuloDoDia(dia: DiaDoCalendario): string {
  const data = formatarData(dia.data, true);
  if (dia.situacao === 'sem') return `${data}: sem evolução diária`;
  if (dia.situacao === 'falta') return `${data}: falta`;
  return `${data}: ${String(dia.sessoes)} ${dia.sessoes === 1 ? 'sessão' : 'sessões'}`;
}

/** O mês do período, de domingo a sábado, com cada dia marcado. */
function Mes({ semanas }: Readonly<{ semanas: ReturnType<typeof semanasDoPeriodo> }>) {
  return (
    <table className="w-full max-w-sm table-fixed text-center text-caption">
      <thead>
        <tr>
          {SEMANA.map((letra, i) => (
            <th
              key={NOME_DO_DIA[i]}
              scope="col"
              abbr={NOME_DO_DIA[i]}
              className="py-1 text-apagado"
            >
              {letra}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {semanas.map((semana) => (
          <tr key={semana.find((d) => d !== null)?.data}>
            {semana.map((dia, i) => (
              <td key={dia?.data ?? `vazio-${String(i)}`} className="p-0.5">
                {dia !== null && (
                  <span
                    title={rotuloDoDia(dia)}
                    aria-label={rotuloDoDia(dia)}
                    className={cn('grid h-7 place-items-center rounded-md num', COR[dia.situacao])}
                  >
                    {dia.dia}
                  </span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** As datas de fora do período, com o motivo; a de antes diz em que mês já entrou, se entrou. */
function DatasDeFora({
  datas,
  jaAnalisados,
}: Readonly<{ datas: readonly DataDeFora[]; jaAnalisados: ReadonlyMap<string, string> }>) {
  if (datas.length === 0) return null;
  const motivo = ({ data, antes }: DataDeFora) => {
    if (!antes) return 'depois do período: fica para a evolução seguinte';
    const mes = jaAnalisados.get(data);
    return mes === undefined
      ? 'antes do período'
      : `antes do período: já entrou na evolução de ${nomeDoMes(mes)}`;
  };
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption font-bold text-texto">Fora do período, não vão para a IA:</p>
      <ul className="flex flex-col gap-0.5 text-caption text-texto-2">
        {datas.map((d) => (
          <li key={d.data}>
            <b className="text-texto">{formatarData(d.data)}</b>, {motivo(d)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * O calendário dos dias analisados (E19, E20): sessões e faltas do período no mês e as datas que
 * o PDF trouxe fora dele.
 */
export function CalendarioDoTita({
  evolucao,
  importacao,
}: Readonly<{ evolucao: Evolucao; importacao: Importacao }>) {
  const { inicio, fim } = evolucao.periodo;
  const fora = datasDeFora(importacao.analises, inicio, fim);
  const antes = fora.filter((d) => d.antes).map((d) => d.data);
  const consulta = useQuery({
    ...diasJaAnalisadosOptions(evolucao.assistidoId ?? 0, evolucao.id, antes),
    enabled: evolucao.assistidoId !== null && antes.length > 0,
  });
  return (
    <details className="rounded-lg border border-borda px-3 py-2 text-caption">
      <summary className="cursor-pointer font-bold text-azul foco-anel">
        Calendário dos dias analisados ({nomeDoMes(inicio)})
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        <Mes semanas={semanasDoPeriodo(inicio, importacao.analises)} />
        <p className="flex flex-wrap gap-3 text-caption text-texto-2">
          <span className="rounded-md bg-ok-soft px-1.5 font-bold text-ok-text">sessão</span>
          <span className="rounded-md bg-alerta-soft px-1.5 font-bold text-alerta-text">falta</span>
          <span>sem evolução diária</span>
        </p>
        <DatasDeFora datas={fora} jaAnalisados={consulta.data ?? new Map<string, string>()} />
      </div>
    </details>
  );
}
