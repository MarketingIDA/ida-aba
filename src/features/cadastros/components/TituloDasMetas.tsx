import { ChartLine, Target } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/ui/button';
import { iniciais } from '@/utils/iniciais';

/** O nome do assistido e o atalho para a evolução das metas em gráfico (E27). */
export function TituloDasMetas({
  assistidoId,
  nome,
}: Readonly<{ assistidoId: number; nome: string | undefined }>) {
  return (
    <div className="flex items-start gap-3.5">
      {nome !== undefined && (
        <span
          aria-hidden="true"
          className="mt-1 grid size-[46px] shrink-0 place-items-center rounded-full bg-info-soft font-extrabold text-azul-escuro"
        >
          {iniciais(nome)}
        </span>
      )}
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.1em] text-info-text uppercase">
          <Target aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Cadastro de metas
        </p>
        <h1>{nome ?? 'Metas do assistido'}</h1>
        {nome !== undefined && (
          <Link
            to={`/progresso/${String(assistidoId)}`}
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-2' })}
          >
            <ChartLine aria-hidden="true" />
            Evolução em gráfico
          </Link>
        )}
      </div>
    </div>
  );
}
