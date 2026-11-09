import type * as React from 'react';

// MODIFIED: o CLI 4.23 gerou `from "cn"` (pacote npm alheio); o cn() do projeto fica em @/lib/utils.
import { cn } from '@/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- quem usa passa htmlFor.
    <label
      data-slot="label"
      // MODIFIED: rótulo do design system IDA (§5.7): 14 px, 700, marinho.
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-bold text-marinho select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
