import { CircleCheck, Info, Lock, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { DevolverEvolucao } from '@/features/evolucoes/components/DevolverEvolucao';
import {
  type ContextoDaConferencia,
  conferidas,
  devolucaoAberta,
  prontaParaConcluir,
} from '@/features/evolucoes/conferencia';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucao: Evolucao;
  ocupado: boolean;
  erro: string | null;
  aoConcluir: () => void;
  aoReabrir: () => void;
  /** As metas já alcançadas (E12) e as lacunas (E10). */
  contexto: ContextoDaConferencia;
}

function Resumo({ evolucao, alertas }: Readonly<{ evolucao: Evolucao; alertas: number }>) {
  if (evolucao.situacao === 'em_conferencia') {
    const n = conferidas(evolucao);
    return (
      <span className="flex items-center gap-2">
        <Info aria-hidden="true" className="size-4 shrink-0 text-azul" />
        {n} de 4 partes conferidas
        {devolucaoAberta(evolucao) !== null && ' · devolução a resolver'}
        {alertas > 0 &&
          ` · ${String(alertas)} ${alertas === 1 ? 'alerta' : 'alertas'} do PDF do Tita sem ciência`}
      </span>
    );
  }
  const Icone = evolucao.situacao === 'enviada' ? Lock : CircleCheck;
  const quando =
    evolucao.concluidaEm === null ? '' : ` em ${formatarDataHora(evolucao.concluidaEm)}`;
  return (
    <span className="flex items-center gap-2">
      <Icone aria-hidden="true" className="size-4 shrink-0 text-ok-ic" />
      {evolucao.situacao === 'enviada'
        ? 'Enviada no arquivo do mês: só leitura'
        : `Concluída${quando}. Vai no arquivo do mês.`}
    </span>
  );
}

/** O que falta para o botão de concluir habilitar. */
function oQueFalta(evolucao: Evolucao): string {
  return devolucaoAberta(evolucao) === null
    ? 'Confira as 4 partes, sem pendências, para concluir'
    : 'Marque a devolução como resolvida para concluir';
}

/**
 * Rodapé fixo da evolução: quantas partes faltam, o erro da última ação e concluir ou reabrir; para
 * a coordenação geral, devolver a concluída com o motivo.
 */
export function BarraDaEvolucao({
  evolucao,
  ocupado,
  erro,
  aoConcluir,
  aoReabrir,
  contexto,
}: Readonly<Props>) {
  const pronta = prontaParaConcluir(evolucao, contexto);
  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-sm font-bold text-texto-2 shadow-lg">
      {erro !== null && (
        <p role="alert" className="text-bloq-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Resumo evolucao={evolucao} alertas={contexto.alertasSemCiencia ?? 0} />
        {evolucao.editavel && evolucao.situacao === 'em_conferencia' && (
          <Button
            size="lg"
            onClick={aoConcluir}
            disabled={ocupado || !pronta}
            title={pronta ? undefined : oQueFalta(evolucao)}
          >
            <CircleCheck aria-hidden="true" />
            Concluir evolução
          </Button>
        )}
        {evolucao.editavel && evolucao.situacao === 'concluida' && (
          <Button size="lg" variant="secondary" onClick={aoReabrir} disabled={ocupado}>
            <Undo2 aria-hidden="true" />
            Reabrir
          </Button>
        )}
        {evolucao.podeDevolver && <DevolverEvolucao evolucaoId={evolucao.id} />}
      </div>
    </div>
  );
}
