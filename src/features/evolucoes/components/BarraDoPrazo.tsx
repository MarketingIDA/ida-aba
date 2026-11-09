import { CircleCheck, Clock } from 'lucide-react';

import { plural, textoDoPrazo } from '@/features/evolucoes/logica';
import { cn } from '@/lib/utils';

interface Props {
  /** Evoluções sem evolução ou em conferência no recorte. */
  faltam: number;
  prazo: string;
  dias: number;
}

/** Rodapé do mês aberto (fixo do tablet para cima; no celular, depois da lista): quantas evoluções faltam e quanto tempo resta até o prazo (E15). */
export function BarraDoPrazo({ faltam, prazo, dias }: Readonly<Props>) {
  const pronto = faltam === 0;
  const atrasado = !pronto && dias < 0;
  const Icone = pronto ? CircleCheck : Clock;
  return (
    <p
      className={cn(
        'z-10 flex items-center gap-2 rounded-xl border bg-superficie px-4 py-3 text-sm font-bold shadow-lg sm:sticky sm:bottom-4',
        atrasado ? 'border-bloq-border text-bloq-text' : 'border-borda text-texto-2',
      )}
    >
      <Icone
        aria-hidden="true"
        className={cn(
          'size-4 shrink-0',
          pronto ? 'text-ok-ic' : 'text-azul',
          atrasado && 'text-bloq-ic',
        )}
      />
      <span>
        {pronto
          ? 'Todas as evoluções do mês estão concluídas'
          : `Faltam ${plural(faltam, 'evolução', 'evoluções')} para o arquivo do mês`}
        {` · prazo ${prazo}, ${textoDoPrazo(dias)}`}
      </span>
    </p>
  );
}
