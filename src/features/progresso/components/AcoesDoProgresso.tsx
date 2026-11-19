import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileDown, FileText, Target } from 'lucide-react';
import { Link } from 'react-router';

import { Button, buttonVariants } from '@/components/ui/button';
import { CompartilharRelatorio } from '@/features/progresso/components/CompartilharRelatorio';
import { baixarRelatorio } from '@/features/progresso/pdf/baixarRelatorio';
import { progressoKeys } from '@/features/progresso/queries';
import {
  type PropsDoRelatorio,
  useDadosDoRelatorio,
} from '@/features/progresso/useDadosDoRelatorio';
import { ehErroApp } from '@/lib/erroApp';

/** Baixa o relatório em PDF (E28) e põe o download no registro. */
function useBaixarRelatorio(props: PropsDoRelatorio) {
  const { dados } = useDadosDoRelatorio(props);
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () => baixarRelatorio(props.assistidoId, dados()),
    onSettled: () =>
      cliente.invalidateQueries({ queryKey: progressoKeys.registro(props.assistidoId) }),
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
function BaixarPdf(props: Readonly<PropsDoRelatorio>) {
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
}: Readonly<Pick<PropsDoRelatorio, 'assistidoId' | 'periodos'>>) {
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

/** As ações do relatório no alto da tela: "Baixar PDF" e, ao lado, compartilhar. */
export function AcoesDoRelatorio(props: Readonly<PropsDoRelatorio>) {
  return (
    <div className="flex items-start gap-2">
      <BaixarPdf {...props} />
      <CompartilharRelatorio {...props} />
    </div>
  );
}
