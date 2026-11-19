import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Cor do ponto, com significado: ok, alerta, neutro, bloqueio e informação. */
const PONTO = {
  ok: 'bg-ok',
  alerta: 'bg-alerta',
  neutro: 'bg-tenue',
  bloq: 'bg-bloq',
  info: 'bg-azul',
} as const;

const GRADE = {
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  largos: 'grid-cols-1 sm:grid-cols-3',
} as const;

export interface CartaoDeContagem<T extends string> {
  valor: T;
  rotulo: string;
  total: number;
  tom: keyof typeof PONTO;
  /** O número como aparece (R$ 1.520,00); sem ele, o total. */
  exibido?: string;
  /** A linha pequena embaixo do número ("subindo a escada"). */
  legenda?: string;
  /** Embaixo do rótulo (no Painel, a linha dos meses); só conteúdo de frase, está num botão. */
  rodape?: ReactNode;
}

interface Props<T extends string> {
  rotulo: string;
  cartoes: CartaoDeContagem<T>[];
  escolhido: T | null;
  /** O card escolhido filtra a lista; clicar de novo nele desfaz o filtro. */
  aoEscolher: (valor: T | null) => void;
  /** Quatro cards: dois por linha no celular; `largos`: três com valor em R$, um por linha. */
  colunas?: keyof typeof GRADE;
}

function Cartao<T extends string>({
  cartao,
  marcado,
  aoEscolher,
}: Readonly<{
  cartao: CartaoDeContagem<T>;
  marcado: boolean;
  aoEscolher: (valor: T | null) => void;
}>) {
  return (
    <button
      type="button"
      aria-pressed={marcado}
      onClick={() => {
        aoEscolher(marcado ? null : cartao.valor);
      }}
      className={cn(
        'relative flex cursor-pointer flex-col items-start gap-0.5 rounded-[18px] border bg-superficie px-4 py-3.5 text-left shadow-sm foco-anel transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none',
        marcado
          ? 'border-azul shadow-[0_0_0_3px_var(--info-soft)]'
          : 'border-borda hover:border-borda-forte',
      )}
    >
      <span className="flex items-center gap-1.5 pr-5 rotulo text-apagado">
        <span aria-hidden="true" className={cn('size-2 rounded-full', PONTO[cartao.tom])} />
        {cartao.rotulo}
      </span>{' '}
      <span
        className={cn(
          'font-display text-[1.75rem] leading-[1.1] font-extrabold num',
          cartao.total === 0 ? 'text-tenue' : 'text-marinho',
        )}
      >
        {cartao.exibido ?? cartao.total}
      </span>{' '}
      {cartao.legenda !== undefined && (
        <span className="text-xs font-bold text-apagado">{cartao.legenda}</span>
      )}
      {cartao.rodape}
      <ArrowUpRight
        aria-hidden="true"
        className="absolute top-3.5 right-3.5 size-[15px] text-apagado opacity-70"
      />
    </button>
  );
}

/** Cards de contagem; todo card abre a lista do que ele conta (CLAUDE.md, regras de interface). */
export function CartoesDeContagem<T extends string>({
  rotulo,
  cartoes,
  escolhido,
  aoEscolher,
  colunas = 3,
}: Readonly<Props<T>>) {
  return (
    <div role="group" aria-label={rotulo} className={cn('grid gap-3', GRADE[colunas])}>
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
