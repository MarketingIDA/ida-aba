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
