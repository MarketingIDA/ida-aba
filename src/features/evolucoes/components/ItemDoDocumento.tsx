import { CircleCheck, FileText, OctagonX, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { plural } from '@/utils/textos';
import { situacaoDaData } from '@dominio/documentos.ts';
import { formatarData } from '@dominio/mes.ts';

export type Tom = 'ok' | 'alerta' | 'bloqueio';

const ESTILO: Record<
  Tom,
  { item: string; aviso: string; icone: typeof CircleCheck; leitor: string }
> = {
  ok: { item: 'border-borda', aviso: 'text-ok-text', icone: CircleCheck, leitor: '' },
  alerta: {
    item: 'border-alerta-border',
    aviso: 'text-alerta-text',
    icone: TriangleAlert,
    leitor: 'Alerta: ',
  },
  bloqueio: {
    item: 'border-bloq-border bg-bloq-soft',
    aviso: 'text-bloq-text',
    icone: OctagonX,
    leitor: 'Bloqueio: ',
  },
};

/** O que a data diz do documento diante do período analisado. */
export function avisoDaData(data: string | null, mesRef: string): { tom: Tom; texto: string } {
  const situacao = situacaoDaData(data, mesRef);
  if (situacao === 'no_periodo') return { tom: 'ok', texto: 'Do período analisado.' };
  if (situacao === 'sem_data') {
    return { tom: 'alerta', texto: 'Sem data: a IA usa o documento como contexto.' };
  }
  return {
    tom: 'alerta',
    texto: `Documento de ${formatarData(data ?? '')}, fora do período analisado: a IA usa como contexto.`,
  };
}

/** A data e o tamanho do documento: "20/10/2026 · 2 páginas", "sem data · Word". */
export function detalheDoDocumento(data: string | null, paginas: number | null): string {
  const quando = data === null ? 'sem data' : formatarData(data);
  const tamanho = paginas === null ? 'Word' : plural(paginas, 'página', 'páginas');
  return `${quando} · ${tamanho}`;
}

/** O cartão de um documento: nome, páginas, o aviso, o texto lido e as ações à direita. */
export function ItemDoDocumento({
  arquivo,
  detalhe,
  tom,
  aviso,
  texto,
  acoes,
}: Readonly<{
  arquivo: string;
  detalhe: string;
  tom: Tom;
  aviso: string;
  texto: string;
  acoes: ReactNode;
}>) {
  const estilo = ESTILO[tom];
  const Icone = estilo.icone;
  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border-[1.5px] p-3.5 sm:flex-row sm:items-start ${estilo.item}`}
    >
      <FileText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-azul" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <b className="break-words text-marinho">{arquivo}</b>
        <span className="text-sm text-texto-2">{detalhe}</span>
        <span className={`flex items-start gap-1.5 text-sm font-semibold ${estilo.aviso}`}>
          <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {estilo.leitor !== '' && <span className="sr-only">{estilo.leitor}</span>}
            {aviso}
          </span>
        </span>
        <details className="text-sm text-texto-2">
          <summary className="w-fit cursor-pointer rounded-md font-bold text-azul foco-anel">
            Ver o que foi lido
          </summary>
          <p className="mt-2 max-h-64 overflow-y-auto rounded-md bg-neutro-suave p-3 whitespace-pre-line">
            {texto}
          </p>
        </details>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:max-w-[22rem] sm:justify-end">
        {acoes}
      </div>
    </li>
  );
}
