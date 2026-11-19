/**
 * Sobre o azul do menu e da barra do topo, o foco é um contorno branco. Texto branco nunca fica
 * sobre azul clareado (branco translúcido por cima dá 3,97:1): card, contador e hover escurecem com
 * o azul-escuro da marca.
 */
export const focoNoAzul =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export const pressionar =
  'transition-[background-color,color,transform,box-shadow] duration-150 motion-reduce:transition-none';

export const botaoNoAzul =
  'grid cursor-pointer place-items-center rounded-md bg-white/14 hover:bg-white/20 active:scale-[0.94]';
