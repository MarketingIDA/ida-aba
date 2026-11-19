import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FileDown, FileText, Target } from 'lucide-react';
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

/** A volta à lista, no alto da tela; ao lado vão as ações do relatório. */
export function VoltarParaEvolucoes() {
  return (
    <Link
      to="/evolucoes"
      className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-bold text-azul foco-anel hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Evoluções
    </Link>
  );
}

/** "Baixar PDF", no alto da tela, na linha da volta à lista (como no protótipo). */
export function BaixarPdf(props: Readonly<Props>) {
  const baixar = useBaixarRelatorio(props);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="secondary"
        size="sm"
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

/** O fim da tela: o cadastro de metas e a evolução mais recente. */
export function AcoesDoProgresso({
  assistidoId,
  periodos,
}: Readonly<Pick<Props, 'assistidoId' | 'periodos'>>) {
  const evolucaoId = periodos[0]?.evolucaoId;
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to={`/metas/${String(assistidoId)}`}
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
