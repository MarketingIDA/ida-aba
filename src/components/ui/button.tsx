import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

// MODIFIED: o CLI 4.23 gerou `from "cn"` (pacote npm alheio); o cn() do projeto fica em @/lib/utils.
import { cn } from '@/lib/utils';

// MODIFIED: variantes e medidas do design system IDA (docs/design-system/README.md §5.1) no lugar
// das do shadcn: primário com borda 3D, secundário branco, fantasma e link; Nunito 700; o
// pressionar responde em 60 ms; desabilitado a 0,45 e sem 3D. Anel de foco em duas camadas.
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border border-transparent font-bold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 select-none active:duration-[60ms] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-azul text-white shadow-3d foco-anel-primario hover:bg-azul-escuro active:translate-y-0.5 active:shadow-none',
        secondary:
          'border-borda-forte bg-superficie text-marinho foco-anel hover:border-azul hover:text-azul active:scale-[0.97]',
        ghost: 'text-texto-2 foco-anel hover:bg-neutro-suave active:scale-[0.97]',
        link: 'h-auto px-0 text-caption text-azul foco-anel hover:underline active:opacity-70',
      },
      size: {
        sm: 'min-h-[34px] gap-1.5 rounded-[10px] px-3 text-caption [&_svg]:size-4',
        md: 'min-h-10 rounded-md px-4 text-sm [&_svg]:size-4',
        lg: 'min-h-[46px] rounded-[14px] px-5 text-[0.9375rem] [&_svg]:size-[18px]',
        icon: 'size-[34px] rounded-[10px] text-apagado hover:text-marinho active:scale-[0.94] [&_svg]:size-[18px]',
        'icon-sm':
          'size-7 rounded-[10px] text-apagado hover:text-marinho active:scale-[0.94] [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
