import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Cor do ponto, com significado: ok, alerta, neutro e bloqueio. */
const PONTO = { ok: 'bg-ok', alerta: 'bg-alerta', neutro: 'bg-tenue', bloq: 'bg-bloq' } as const;

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
      {cartoes.map((cartao) => {
        const marcado = escolhido === cartao.valor;
        return (
          <button
            key={cartao.valor}
            type="button"
            aria-pressed={marcado}
            onClick={() => {
              aoEscolher(marcado ? null : cartao.valor);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-start gap-1 rounded-xl border bg-superficie px-4 py-3 text-left shadow-sm foco-anel transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none',
              marcado
                ? 'border-azul shadow-[0_0_0_3px_var(--info-soft)]'
                : 'border-borda hover:border-borda-forte',
            )}
          >
            <span className="font-display text-2xl leading-none font-bold text-marinho num">
              {cartao.exibido ?? cartao.total}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-texto-2">
              <span aria-hidden="true" className={cn('size-2 rounded-full', PONTO[cartao.tom])} />
              {cartao.rotulo}
            </span>
            {cartao.rodape}
          </button>
        );
      })}
    </div>
  );
}
