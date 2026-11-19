import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface Aba<T extends string> {
  valor: T;
  rotulo: string;
  icone?: LucideIcon;
}

interface Props<T extends string> {
  rotulo: string;
  abas: readonly Aba<T>[];
  escolhida: T;
  aoEscolher: (valor: T) => void;
}

/** O `.tabs` do protótipo: a pílula branca com a aba escolhida em azul. */
export function Abas<T extends string>({
  rotulo,
  abas,
  escolhida,
  aoEscolher,
}: Readonly<Props<T>>) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className="flex w-max max-w-full gap-1.5 overflow-x-auto rounded-full border border-borda bg-white p-[5px] shadow-sm"
    >
      {abas.map(({ valor, rotulo: texto, icone: Icone }) => (
        <button
          key={valor}
          type="button"
          aria-pressed={valor === escolhida}
          onClick={() => {
            aoEscolher(valor);
          }}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full px-4 font-extrabold whitespace-nowrap foco-anel transition-colors duration-150',
            valor === escolhida ? 'bg-azul text-white' : 'text-apagado hover:text-marinho',
          )}
        >
          {Icone !== undefined && <Icone aria-hidden="true" className="size-[15px]" />}
          {texto}
        </button>
      ))}
    </div>
  );
}
