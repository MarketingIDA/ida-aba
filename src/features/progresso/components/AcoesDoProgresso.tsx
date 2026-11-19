import { useMutation } from '@tanstack/react-query';
import { FileDown, FileText, Target } from 'lucide-react';
import { Link } from 'react-router';

import { Button, buttonVariants } from '@/components/ui/button';
import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import { baixarRelatorio } from '@/features/progresso/pdf/baixarRelatorio';
import { codigoDoRelatorio } from '@/features/progresso/pdf/gerarRelatorio';
import { useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';
import type { MedianaDaCarteira } from '@dominio/mediana.ts';
import type { Progresso } from '@dominio/progresso.ts';

interface Props {
  nome: string;
  assistidoId: number;
  progresso: Progresso;
  mediana: MedianaDaCarteira | null;
  /** Do mais recente ao mais antigo, como vêm do banco. */
  periodos: readonly PeriodoDaEvolucao[];
}

/** Monta o relatório em PDF (E28) com os números da tela, sem filtro, e baixa. */
function useBaixarRelatorio({ nome, assistidoId, progresso, mediana, periodos }: Props) {
  const usuario = useUsuario();
  return useMutation({
    mutationFn: () =>
      baixarRelatorio(assistidoId, {
        nome,
        codigo: codigoDoRelatorio(periodos[0]?.codigo ?? String(assistidoId)),
        emitidoPor: usuario?.nome ?? 'usuário do sistema',
        emitidoEm: new Date(),
        progresso,
        mediana,
        periodos: [...periodos].reverse(),
      }),
  });
}

function BaixarPdf(props: Readonly<Props>) {
  const baixar = useBaixarRelatorio(props);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="secondary"
        size="lg"
        disabled={baixar.isPending}
        onClick={() => {
          baixar.mutate();
        }}
      >
        <FileDown aria-hidden="true" />
        {baixar.isPending ? 'Gerando o PDF…' : 'Baixar PDF'}
      </Button>
      {baixar.isSuccess && (
        <p role="status" className="text-caption font-semibold text-texto-2">
          Baixado: {baixar.data}
        </p>
      )}
      {baixar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(baixar.error)
            ? baixar.error.message
            : 'Não foi possível gerar o PDF. Tente de novo.'}
        </p>
      )}
    </div>
  );
}

/** O fim da tela: o relatório em PDF, o cadastro de metas e a evolução mais recente. */
export function AcoesDoProgresso(props: Readonly<Props>) {
  const evolucaoId = props.periodos[0]?.evolucaoId;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <BaixarPdf {...props} />
      <Link
        to={`/metas/${String(props.assistidoId)}`}
        className={buttonVariants({ variant: 'secondary', size: 'lg' })}
      >
        <Target aria-hidden="true" />
        Cadastro de metas
      </Link>
      {evolucaoId !== undefined && (
        <Link
          to={`/evolucoes/${evolucaoId}`}
          className={buttonVariants({ variant: 'primary', size: 'lg' })}
        >
          <FileText aria-hidden="true" />
          Evolução mais recente
        </Link>
      )}
    </div>
  );
}
