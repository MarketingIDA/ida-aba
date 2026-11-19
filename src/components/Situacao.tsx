import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const TONS = {
  ok: 'border-ok-border bg-ok-soft text-ok-text',
  alerta: 'border-alerta-border bg-alerta-soft text-alerta-text',
  neutro: 'border-borda bg-neutro-suave text-texto-2',
  info: 'border-info-border bg-info-soft text-info-text',
  bloq: 'border-bloq-border bg-bloq-soft text-bloq-text',
} as const;

const PONTOS = {
  ok: 'bg-ok',
  alerta: 'bg-alerta',
  neutro: 'bg-tenue',
  info: 'bg-azul',
  bloq: 'bg-bloq',
} as const;

interface Props {
  rotulo: string;
  tom: keyof typeof TONS;
  /** O ícone da situação, no lugar do ponto (o `.pill` do protótipo). */
  icone?: LucideIcon;
}

/** Pílula de situação: ponto ou ícone mais o texto, nunca só a cor. */
export function Situacao({ rotulo, tom, icone: Icone }: Readonly<Props>) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-[11px] text-[0.78rem] font-extrabold whitespace-nowrap',
        TONS[tom],
      )}
    >
      {Icone === undefined ? (
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', PONTOS[tom])} />
      ) : (
        <Icone aria-hidden="true" className="size-3.5" strokeWidth={2} />
      )}
      {rotulo}
    </span>
  );
}
