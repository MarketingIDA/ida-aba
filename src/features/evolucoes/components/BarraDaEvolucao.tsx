import { CircleCheck, Info, Lock, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { conferidas, prontaParaConcluir } from '@/features/evolucoes/conferencia';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucao: Evolucao;
  ocupado: boolean;
  erro: string | null;
  aoConcluir: () => void;
  aoReabrir: () => void;
}

function Resumo({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  if (evolucao.situacao === 'em_conferencia') {
    const n = conferidas(evolucao);
    return (
      <span className="flex items-center gap-2">
        <Info aria-hidden="true" className="size-4 shrink-0 text-azul" />
        {n} de 4 partes conferidas
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

/** Rodapé fixo da evolução: quantas partes faltam, o erro da última ação e concluir ou reabrir. */
export function BarraDaEvolucao({
  evolucao,
  ocupado,
  erro,
  aoConcluir,
  aoReabrir,
}: Readonly<Props>) {
  const pronta = prontaParaConcluir(evolucao);
  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 text-sm font-bold text-texto-2 shadow-lg">
      {erro !== null && (
        <p role="alert" className="text-bloq-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Resumo evolucao={evolucao} />
        {evolucao.editavel && evolucao.situacao === 'em_conferencia' && (
          <Button
            size="lg"
            onClick={aoConcluir}
            disabled={ocupado || !pronta}
            title={pronta ? undefined : 'Confira as 4 partes, sem pendências, para concluir'}
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
      </div>
    </div>
  );
}
