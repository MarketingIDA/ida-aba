import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * O twMerge conhece só os tamanhos de fonte do Tailwind. Os do tema (`--text-*` em `index.css` que
 * não existem no Tailwind) precisam ser declarados aqui; senão `text-caption` passa por cor e apaga
 * o `text-white` do botão primário pequeno.
 */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['2xs', 'caption', 'kpi'] } },
});

/** Junta classes condicionais e resolve conflitos do Tailwind (usado por todo componente shadcn). */
export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
