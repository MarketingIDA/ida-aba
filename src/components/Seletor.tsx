import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** `select` nativo com a mesma medida e o mesmo foco do Input (lista curta e fixa). */
export function Seletor({ className, ...props }: Readonly<ComponentProps<'select'>>) {
  return (
    <select
      className={cn(
        'min-h-11 w-full min-w-0 rounded-md border border-input bg-superficie px-3 text-base font-semibold text-texto transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-azul focus-visible:shadow-[0_0_0_4px_var(--info-soft)] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-bloq-text motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

/**
 * O seletor das barras de filtro (o `.sel` do protótipo): 40 px, borda forte, texto marinho em
 * negrito e a seta desenhada. No toque, a letra fica em 16 px para o iOS não dar zoom.
 */
export function SeletorCompacto({ className, ...props }: Readonly<ComponentProps<'select'>>) {
  return (
    <span className={cn('relative inline-flex max-w-[220px] min-w-0', className)}>
      <select
        className="h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-md border-[1.5px] border-borda-forte bg-superficie pr-[34px] pl-3 text-[0.84rem] font-bold text-marinho transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-azul focus-visible:shadow-[0_0_0_4px_var(--info-soft)] motion-reduce:transition-none pointer-coarse:text-base"
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        strokeWidth={2.5}
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-marinho"
      />
    </span>
  );
}
