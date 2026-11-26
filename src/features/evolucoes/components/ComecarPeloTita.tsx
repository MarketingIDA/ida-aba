import { ChevronLeft, PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import {
  EscolhaDoPdf,
  LeituraParaConferir,
} from '@/features/evolucoes/components/ImportacaoDoTita';
import { useComecarPeloTita } from '@/features/evolucoes/routes/useComecarPeloTita';

type Tita = ReturnType<typeof useComecarPeloTita>;

/** Sem relatório do Tita no mês: a escrita à mão (E26), à parte do PDF. */
function EscritaAMao({ tita }: Readonly<{ tita: Tita }>) {
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-borda pt-4">
      <p className="text-sm text-texto-2">Sem o relatório do Tita para este mês?</p>
      <Button
        variant="ghost"
        className="self-start"
        disabled={tita.salvando || tita.criandoAMao || tita.lendo}
        onClick={tita.escreverAMao}
      >
        <PenLine aria-hidden="true" />
        {tita.criandoAMao ? 'Criando…' : 'Escrever à mão'}
      </Button>
    </div>
  );
}

/**
 * O começo da evolução de um assistido: o PDF do Tita primeiro (E02), lido e conferido antes de a
 * evolução existir; sem relatório, a escrita à mão (E26) fica à parte.
 */
export function ComecarPeloTita({
  linha,
  mesAberto,
  aoVoltar,
}: Readonly<{ linha: LinhaDoMes; mesAberto: string; aoVoltar: () => void }>) {
  const tita = useComecarPeloTita(linha.assistidoId, linha.nome, mesAberto);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      <button
        type="button"
        onClick={aoVoltar}
        disabled={tita.salvando || tita.criandoAMao}
        className="flex items-center gap-1 self-start rounded-sm text-sm font-bold text-azul foco-anel"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Escolher outro assistido
      </button>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold text-marinho">{linha.nome}</h3>
        <p className="text-sm text-texto-2">
          Suba o Relatório de Evoluções Diárias do Tita. A evolução só é criada depois que você
          conferir o que o sistema leu. O PDF é lido neste computador e não é guardado.
        </p>
      </div>
      {tita.pendente === null ? (
        <EscolhaDoPdf
          rotulo="Escolher o PDF do Tita"
          lendo={tita.lendo}
          aoEscolher={tita.escolher}
        />
      ) : (
        <LeituraParaConferir pendente={tita.pendente} tita={tita} />
      )}
      {tita.erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {tita.erro}
        </p>
      )}
      {tita.pendente === null && <EscritaAMao tita={tita} />}
    </div>
  );
}
