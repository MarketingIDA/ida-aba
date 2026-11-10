import { ListOrdered } from 'lucide-react';

import { plural } from '@/features/evolucoes/logica';
import { cn } from '@/lib/utils';
import { MINIMO_DE_LINHAS, MINIMO_DE_METAS_DO_MES } from '@dominio/evolucao.ts';

function Contador({ texto, falta }: Readonly<{ texto: string; falta: boolean }>) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold num',
        falta ? 'border-bloq-border bg-bloq-soft text-bloq-text' : 'border-borda text-texto-2',
      )}
    >
      <ListOrdered aria-hidden="true" className="size-3.5" />
      {texto}
    </span>
  );
}

/** "8 linhas · mínimo 7" (E10); em vermelho enquanto falta. */
export function ContadorDeLinhas({ linhas }: Readonly<{ linhas: number }>) {
  return (
    <Contador
      texto={`${plural(linhas, 'linha', 'linhas')} · mínimo ${String(MINIMO_DE_LINHAS)}`}
      falta={linhas < MINIMO_DE_LINHAS}
    />
  );
}

/** "3 metas · mínimo 4" nas metas do mês (E12); nas alcançadas, só a contagem. */
export function ContadorDeMetas({ metas, doMes }: Readonly<{ metas: number; doMes: boolean }>) {
  const minimo = doMes ? ` · mínimo ${String(MINIMO_DE_METAS_DO_MES)}` : '';
  return (
    <Contador
      texto={`${plural(metas, 'meta', 'metas')}${minimo}`}
      falta={doMes && metas < MINIMO_DE_METAS_DO_MES}
    />
  );
}
