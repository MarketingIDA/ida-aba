import { CircleCheck, Info, OctagonX, Pencil, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type Tom = 'bloq' | 'alerta' | 'info';

const DO_TOM: Record<Tom, { borda: string; icone: string; Icone: typeof OctagonX }> = {
  bloq: { borda: 'border-l-bloq', icone: 'bg-bloq-soft text-bloq-ic', Icone: OctagonX },
  alerta: {
    borda: 'border-l-alerta',
    icone: 'bg-alerta-soft text-alerta-text',
    Icone: TriangleAlert,
  },
  info: { borda: 'border-l-azul', icone: 'bg-info-soft text-info-text', Icone: Pencil },
};

const ROTULO_LIDO: Record<Tom, string> = { bloq: 'Bloqueio: ', alerta: 'Alerta: ', info: '' };

/** Uma conferência aberta (o `.pend` do protótipo): de onde vem, o que é e o que fazer. */
export function Pendencia({
  tom,
  rotulo,
  texto,
  detalhe,
  children,
}: Readonly<{
  tom: Tom;
  rotulo?: string;
  texto: string;
  detalhe?: string;
  children?: ReactNode;
}>) {
  const { borda, icone, Icone } = DO_TOM[tom];
  return (
    <li
      className={cn(
        'rounded-[18px] border border-l-[6px] border-borda bg-superficie px-4 py-3.5 shadow-sm',
        borda,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn('grid size-[34px] shrink-0 place-items-center rounded-[11px]', icone)}
        >
          <Icone className="size-[18px]" />
        </span>
        <div className="min-w-0">
          {rotulo !== undefined && (
            <span className="mb-0.5 block text-[0.65625rem] font-extrabold tracking-[0.08em] text-apagado uppercase">
              {rotulo}
            </span>
          )}
          <b className="block text-sm leading-snug text-marinho">
            <span className="sr-only">{ROTULO_LIDO[tom]}</span>
            {texto}
          </b>
          {detalhe !== undefined && (
            <p className="mt-0.5 text-caption font-semibold text-texto-2">{detalhe}</p>
          )}
        </div>
      </div>
      {children != null && <div className="mt-3 flex flex-wrap gap-2 pl-[46px]">{children}</div>}
    </li>
  );
}

/** Um recado do painel (a `.nota` do protótipo). */
export function Nota({ ok = false, children }: Readonly<{ ok?: boolean; children: ReactNode }>) {
  const Icone = ok ? CircleCheck : Info;
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 rounded-[14px] border-l-[6px] px-4 py-3 text-[0.84375rem] font-bold',
        ok ? 'border-l-ok bg-ok-soft text-ok-text' : 'border-l-azul bg-info-soft text-info-text',
      )}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** O rótulo em caixa alta do painel (o `.lado-k` do protótipo). */
export function Rotulo({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="mx-0.5 mt-2 text-[0.6875rem] font-extrabold tracking-[0.1em] text-apagado uppercase">
      {children}
    </p>
  );
}
