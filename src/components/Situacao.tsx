import { cn } from '@/lib/utils';

const TONS = {
  ok: 'border-ok-border bg-ok-soft text-ok-text',
  alerta: 'border-alerta-border bg-alerta-soft text-alerta-text',
  neutro: 'border-borda bg-neutro-suave text-apagado',
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
}

/** Pílula de situação: ponto de cor mais o texto, nunca só a cor. */
export function Situacao({ rotulo, tom }: Readonly<Props>) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold',
        TONS[tom],
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', PONTOS[tom])} />
      {rotulo}
    </span>
  );
}
