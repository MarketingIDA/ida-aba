import { ChartLine } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/ui/button';

/** O nome do assistido e o atalho para a evolução das metas em gráfico (E27). */
export function TituloDasMetas({
  assistidoId,
  nome,
}: Readonly<{ assistidoId: number; nome: string | undefined }>) {
  return (
    <>
      <div>
        <p className="mb-1.5 rotulo text-azul">Plano terapêutico</p>
        <h1>{nome ?? 'Metas do assistido'}</h1>
      </div>
      {nome !== undefined && (
        <Link
          to={`/progresso/${String(assistidoId)}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'self-start' })}
        >
          <ChartLine aria-hidden="true" />
          Evolução em gráfico
        </Link>
      )}
    </>
  );
}
