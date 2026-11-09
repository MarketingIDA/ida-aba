import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  /** Vazio sempre convida a uma ação, quando há uma. */
  acao?: ReactNode;
}

/** Estado vazio: ícone num círculo de 56 px, título em Baloo e a ação que resolve. */
export function EmptyState({ icone: Icone, titulo, descricao, acao }: Readonly<Props>) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-borda bg-superficie p-6 shadow-md sm:p-[26px]">
      <span className="grid size-14 place-items-center rounded-full bg-info-soft text-azul">
        <Icone aria-hidden="true" className="size-6" strokeWidth={1.6} />
      </span>
      <h2>{titulo}</h2>
      <p className="max-w-[60ch] text-sm text-texto-2">{descricao}</p>
      {acao}
    </div>
  );
}
