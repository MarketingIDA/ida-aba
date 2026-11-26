import { ChevronLeft, FileUp, PenLine } from 'lucide-react';
import { type DragEvent, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import { LeituraParaConferir } from '@/features/evolucoes/components/ImportacaoDoTita';
import { useComecarPeloTita } from '@/features/evolucoes/routes/useComecarPeloTita';

type Tita = ReturnType<typeof useComecarPeloTita>;

/** Arrastar um arquivo para cima da área: `sobre` enquanto ele passa, e o arquivo ao soltar. */
function useSoltar(aoEscolher: ((arquivo: File) => void) | null) {
  const [sobre, setSobre] = useState(false);
  const aoSoltar = {
    onDragOver: (evento: DragEvent) => {
      evento.preventDefault();
      setSobre(true);
    },
    onDragLeave: () => {
      setSobre(false);
    },
    onDrop: (evento: DragEvent) => {
      evento.preventDefault();
      setSobre(false);
      const [arquivo] = evento.dataTransfer.files;
      if (arquivo !== undefined) aoEscolher?.(arquivo);
    },
  };
  return { sobre, aoSoltar };
}

/**
 * A área do PDF, já pronta quando a janela abre: arrastar o arquivo ou clicar. Ao abrir, a escolha
 * do arquivo do computador já aparece sozinha, quando o navegador deixa (ele só deixa logo depois
 * de um clique); se não deixar, a área continua ali.
 */
function AreaDoPdf({
  lendo,
  aoEscolher,
}: Readonly<{ lendo: boolean; aoEscolher: (arquivo: File) => void }>) {
  const entrada = useRef<HTMLInputElement>(null);
  const jaAbriu = useRef(false);
  const { sobre, aoSoltar } = useSoltar(lendo ? null : aoEscolher);
  useEffect(() => {
    if (jaAbriu.current) return;
    jaAbriu.current = true;
    entrada.current?.click();
  }, []);
  return (
    <div {...aoSoltar}>
      <button
        type="button"
        disabled={lendo}
        onClick={() => {
          entrada.current?.click();
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center foco-anel hover:border-azul hover:bg-info-soft disabled:opacity-70 ${
          sobre ? 'border-azul bg-info-soft' : 'border-borda-forte bg-superficie'
        }`}
      >
        <FileUp aria-hidden="true" className="size-7 text-azul" />
        <b className="text-base text-marinho">
          {lendo ? 'Lendo o PDF…' : 'Escolher o PDF do Tita'}
        </b>
        <span className="text-sm text-texto-2">ou arraste o arquivo para cá</span>
      </button>
      <input
        ref={entrada}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="PDF do Tita"
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => {
          const [arquivo] = evento.target.files ?? [];
          evento.target.value = '';
          if (arquivo !== undefined) aoEscolher(arquivo);
        }}
      />
    </div>
  );
}

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
        <AreaDoPdf lendo={tita.lendo} aoEscolher={tita.escolher} />
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
