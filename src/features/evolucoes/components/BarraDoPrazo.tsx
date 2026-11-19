import { CircleCheck, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

import { BarraInferior } from '@/components/BarraInferior';
import { plural, textoDoPrazo } from '@/features/evolucoes/logica';
import { cn } from '@/lib/utils';

interface Props {
  /** Evoluções sem evolução ou em conferência no recorte. */
  faltam: number;
  prazo: string;
  dias: number;
  /** As ações da barra: para o coordenador, o arquivo do mês e a nova evolução. */
  acoes?: ReactNode;
}

/** A barra inferior do mês aberto: quantas evoluções faltam e quanto resta até o prazo (E15). */
export function BarraDoPrazo({ faltam, prazo, dias, acoes }: Readonly<Props>) {
  const pronto = faltam === 0;
  const atrasado = !pronto && dias < 0;
  const Icone = pronto ? CircleCheck : Clock;
  return (
    <BarraInferior
      regra={
        <span className={cn('flex items-center gap-2', atrasado && 'text-bloq-text')}>
          <Icone
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0',
              pronto ? 'text-ok-ic' : 'text-azul',
              atrasado && 'text-bloq-ic',
            )}
          />
          {pronto
            ? 'Todas as evoluções do mês estão concluídas'
            : `Faltam ${plural(faltam, 'evolução', 'evoluções')} para o arquivo do mês`}
          {` · prazo ${prazo}, ${textoDoPrazo(dias)}`}
        </span>
      }
      acoes={acoes}
    />
  );
}
