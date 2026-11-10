import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Campo de várias linhas, com as medidas e o foco do `Input` (design system IDA §5.7). */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full min-w-0 resize-y rounded-md border border-input bg-superficie px-3 py-2.5 text-base leading-relaxed font-semibold text-texto transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-apagado focus-visible:border-azul focus-visible:shadow-[0_0_0_4px_var(--info-soft)] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-bloq-text motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
