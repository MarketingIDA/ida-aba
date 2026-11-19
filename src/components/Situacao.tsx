import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const TONS = {
  ok: 'border-ok-border bg-ok-soft text-ok-text',
  alerta: 'border-alerta-border bg-alerta-soft text-alerta-text',
  neutro: 'border-borda bg-neutro-suave text-texto-2',
  info: 'border-info-border bg-info-soft text-info-text',
  bloq: 'border-bloq-border bg-bloq-soft text-bloq-text',
} as const;

interface Props {
  rotulo: string;
  tom: keyof typeof TONS;
  /** A versão de 24 px dos cards (o `.pg-meta-h .pill` do protótipo). */
  pequena?: boolean;
  /** O ícone da situação, no lugar do ponto (o `.pill` do protótipo). */
  icone?: LucideIcon;
}

/** Pílula de situação (o `.pill` do protótipo): texto, às vezes com ícone, nunca só a cor. */
export function Situacao({ rotulo, tom, icone: Icone, pequena = false }: Readonly<Props>) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-[11px] font-extrabold whitespace-nowrap',
        pequena ? 'h-6 text-xs' : 'h-[26px] text-[0.78rem]',
        TONS[tom],
      )}
    >
      {Icone !== undefined && <Icone aria-hidden="true" className="size-3.5" strokeWidth={2} />}
      {rotulo}
    </span>
  );
}
