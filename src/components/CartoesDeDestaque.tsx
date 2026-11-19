import { ArrowUpRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Os três fundos do `.kpi` do protótipo: azul, marinho e branco. */
const FUNDO = {
  azul: 'bg-gradiente-kpi-azul text-white border-transparent',
  marinho: 'bg-gradiente-kpi-marinho text-white border-transparent',
  branco: 'bg-superficie text-marinho border-borda',
} as const;

const ICONE = {
  azul: 'bg-white/18 text-white',
  marinho: 'bg-white/12 text-white',
  branco: 'bg-info-soft text-azul',
} as const;

export interface CartaoDeDestaque<T extends string> {
  valor: T;
  rotulo: string;
  total: number;
  legenda: string;
  fundo: keyof typeof FUNDO;
  icone: LucideIcon;
}

interface Props<T extends string> {
  rotulo: string;
  cartoes: readonly CartaoDeDestaque<T>[];
  escolhido: T | null;
  /** O card escolhido filtra a lista; clicar de novo nele desfaz o filtro. */
  aoEscolher: (valor: T | null) => void;
}

function Cartao<T extends string>({
  cartao,
  marcado,
  aoEscolher,
}: Readonly<{
  cartao: CartaoDeDestaque<T>;
  marcado: boolean;
  aoEscolher: (valor: T | null) => void;
}>) {
  const Icone = cartao.icone;
  return (
    <button
      type="button"
      aria-pressed={marcado}
      onClick={() => {
        aoEscolher(marcado ? null : cartao.valor);
      }}
      className={cn(
        "relative isolate flex cursor-pointer flex-col items-start gap-1 overflow-hidden rounded-[22px] border p-5 text-left shadow-md foco-anel transition-[box-shadow,transform] duration-150 before:absolute before:-top-16 before:-right-10 before:-z-10 before:size-44 before:rounded-full before:bg-white/8 before:content-[''] after:absolute after:-right-2 after:-bottom-20 after:-z-10 after:size-32 after:rounded-full after:bg-white/6 after:content-[''] active:scale-[0.98] motion-reduce:transition-none",
        FUNDO[cartao.fundo],
        cartao.fundo === 'branco' && 'before:bg-info-soft/70 after:bg-info-soft/50',
        marcado && 'shadow-[0_0_0_3px_var(--info-border)]',
      )}
    >
      <span className="flex items-center gap-2.5 pr-5 text-xs font-extrabold tracking-[0.08em] uppercase">
        <span
          aria-hidden="true"
          className={cn('grid size-8 place-items-center rounded-[10px]', ICONE[cartao.fundo])}
        >
          <Icone className="size-4" />
        </span>
        {cartao.rotulo}
      </span>{' '}
      <span className="mt-2 font-display text-[2.4rem] leading-none font-extrabold num">
        {cartao.total}
      </span>{' '}
      <span className="mt-1 text-[0.8125rem] font-bold opacity-90">{cartao.legenda}</span>
      <ArrowUpRight aria-hidden="true" className="absolute top-4 right-4 size-[15px] opacity-70" />
    </button>
  );
}

/** Os cards grandes do protótipo (`.kpi`); cada um abre a lista do que conta. */
export function CartoesDeDestaque<T extends string>({
  rotulo,
  cartoes,
  escolhido,
  aoEscolher,
}: Readonly<Props<T>>) {
  return (
    <div role="group" aria-label={rotulo} className="grid gap-3.5 sm:grid-cols-3">
      {cartoes.map((cartao) => (
        <Cartao
          key={cartao.valor}
          cartao={cartao}
          marcado={escolhido === cartao.valor}
          aoEscolher={aoEscolher}
        />
      ))}
    </div>
  );
}
