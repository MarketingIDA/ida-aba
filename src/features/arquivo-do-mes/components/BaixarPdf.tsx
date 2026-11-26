import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { baixarPdf } from '@/features/arquivo-do-mes/pdf/baixarPdf';
import { registrarAcao } from '@/lib/auditoria';
import { ehErroApp } from '@/lib/erroApp';

interface Props {
  carteiraId: number;
  mes: string;
  /** "Baixar PDF" no arquivo enviado; "Baixar a prévia" antes do envio. */
  rotulo: string;
  tamanho?: 'sm' | 'lg';
}

/**
 * Monta o PDF do arquivo do mês no navegador e baixa (E14). Mostra que está gerando, o nome do
 * arquivo que saiu e, se falhar, o motivo.
 */
export function BaixarPdf({ carteiraId, mes, rotulo, tamanho = 'lg' }: Readonly<Props>) {
  const baixar = useMutation({
    mutationFn: async () => {
      const nome = await baixarPdf(carteiraId, mes);
      registrarAcao('baixou_arquivo_pdf', `${String(carteiraId)}:${mes}`, { arquivo: nome });
      return nome;
    },
  });
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="secondary"
        size={tamanho}
        disabled={baixar.isPending}
        onClick={() => {
          baixar.mutate();
        }}
      >
        <Download aria-hidden="true" />
        {baixar.isPending ? 'Gerando o PDF…' : rotulo}
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
