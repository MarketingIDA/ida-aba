import { Check, CircleCheck, Clock, OctagonX, Pencil, TriangleAlert, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { NumeroDaParte, Parte } from '@/features/evolucoes/api/evolucao.api';
import { TITULO_DA_PARTE } from '@/features/evolucoes/conferencia';
import { formatarDataHora } from '@/features/evolucoes/textos';
import { cn } from '@/lib/utils';

interface Props {
  parte: Parte;
  /** De onde veio o conteúdo (o cadastro, quem escreveu e quando). */
  origem: string;
  /** Ao lado do título: o contador de linhas ou de metas. */
  contador?: ReactNode;
  /** O que impede conferir, ou `null`. */
  pendencia: string | null;
  /** O que olhar sem impedir a conferência (alerta), ou `null`. */
  aviso?: string | null;
  /** O coordenador da carteira, com a evolução em conferência. */
  podeMudar: boolean;
  editando: boolean;
  /** `undefined`: a parte não se edita aqui (a identificação vem do cadastro). */
  aoEditar?: (() => void) | undefined;
  aoConferir: (conferida: boolean) => void;
  ocupado: boolean;
  children: ReactNode;
}

function Situacao({ parte, pendencia }: Readonly<Pick<Props, 'parte' | 'pendencia'>>) {
  if (parte.conferidaEm !== null) {
    const quem = parte.conferidaPor === null ? '' : ` por ${parte.conferidaPor}`;
    return (
      <span className="flex items-center gap-1.5 text-ok-text">
        <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
        Conferida{quem} em {formatarDataHora(parte.conferidaEm)}
      </span>
    );
  }
  if (pendencia !== null) {
    return (
      <span className="flex items-center gap-1.5 text-bloq-text">
        <OctagonX aria-hidden="true" className="size-4 shrink-0" />
        {pendencia}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      Aguardando a sua conferência
    </span>
  );
}

function Acoes(props: Readonly<Props>) {
  const { parte, pendencia, aoEditar, aoConferir, ocupado } = props;
  const conferida = parte.conferidaEm !== null;
  return (
    <span className="flex flex-wrap gap-2">
      {aoEditar !== undefined && (
        <Button variant="secondary" size="sm" onClick={aoEditar} disabled={ocupado}>
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      )}
      {conferida ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            aoConferir(false);
          }}
          disabled={ocupado}
        >
          <Undo2 aria-hidden="true" />
          Desfazer conferência
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            aoConferir(true);
          }}
          disabled={ocupado || pendencia !== null}
        >
          <Check aria-hidden="true" />
          Marcar como conferida
        </Button>
      )}
    </span>
  );
}

const ETIQUETA =
  'inline-flex items-center gap-1 rounded-full px-2 py-px text-[0.72rem] font-extrabold whitespace-nowrap';

/** As etiquetas do protótipo ao lado do título: bloqueio, alerta e conferida. */
function Etiquetas({
  parte,
  pendencia,
  aviso,
}: Readonly<Pick<Props, 'parte' | 'pendencia' | 'aviso'>>) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {pendencia !== null && (
        <span className={cn(ETIQUETA, 'bg-bloq-soft text-bloq-text')}>
          <OctagonX aria-hidden="true" className="size-3" />1 bloqueio
        </span>
      )}
      {aviso != null && (
        <span className={cn(ETIQUETA, 'bg-alerta-soft text-alerta-text')}>
          <TriangleAlert aria-hidden="true" className="size-3" />1 alerta
        </span>
      )}
      {parte.conferidaEm !== null && (
        <span className={cn(ETIQUETA, 'bg-ok-soft text-ok-text')}>
          <Check aria-hidden="true" className="size-3" />
          Conferida
        </span>
      )}
    </span>
  );
}

function AvisoDaParte({ aviso }: Readonly<{ aviso: string }>) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-alerta-border bg-alerta-soft px-3 py-2 text-caption font-semibold text-alerta-text">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {aviso}
    </p>
  );
}

/** Uma parte da evolução: número, título, origem, o conteúdo e a conferência. */
export function ParteDaEvolucao(props: Readonly<Props>) {
  const { parte, origem, contador, podeMudar, editando, children } = props;
  const numero: NumeroDaParte = parte.numero;
  const conferida = parte.conferidaEm !== null;
  const rodape = (podeMudar && !editando) || (!podeMudar && conferida);
  return (
    <section
      id={`p-${String(numero)}`}
      tabIndex={-1}
      aria-labelledby={`parte-${String(numero)}`}
      className={cn(
        'scroll-mt-20 rounded-xl border bg-superficie shadow-md outline-none',
        conferida ? 'border-ok-border' : 'border-borda',
      )}
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-borda px-5 py-4">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full font-display font-bold',
            conferida ? 'bg-ok-soft text-ok-text' : 'bg-info-soft text-azul-escuro',
          )}
        >
          {conferida ? <Check className="size-4" /> : numero}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={`parte-${String(numero)}`}>{TITULO_DA_PARTE[numero]}</h2>
          <p className="text-caption font-semibold text-apagado">{origem}</p>
        </div>
        <span className="flex flex-wrap items-center gap-2">
          {contador}
          <Etiquetas parte={parte} pendencia={props.pendencia} aviso={props.aviso ?? null} />
        </span>
      </header>
      <div className="flex flex-col gap-3 px-5 py-4">
        {props.aviso != null && <AvisoDaParte aviso={props.aviso} />}
        {children}
      </div>
      {rodape && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-borda px-5 py-3 text-caption font-bold text-texto-2">
          <Situacao {...props} />
          {podeMudar && <Acoes {...props} />}
        </footer>
      )}
    </section>
  );
}
