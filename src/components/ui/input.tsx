import { Input as InputPrimitive } from '@base-ui/react/input';
import type * as React from 'react';

// MODIFIED: o CLI 4.23 gerou `from "cn"` (pacote npm alheio); o cn() do projeto fica em @/lib/utils.
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      // MODIFIED: medidas do design system IDA (§5.7): 44 px de alvo, raio 12, borda forte, texto
      // de 16 px (o iOS não dá zoom), foco com borda azul e halo --info-soft; erro em --bloq-text.
      className={cn(
        'min-h-11 w-full min-w-0 rounded-md border border-input bg-superficie px-3 text-base font-semibold text-texto transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-apagado focus-visible:border-azul focus-visible:shadow-[0_0_0_4px_var(--info-soft)] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-bloq-text motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
