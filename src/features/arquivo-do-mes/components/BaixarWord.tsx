import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { baixarWord } from '@/features/arquivo-do-mes/word/baixarWord';
import { registrarAcao } from '@/lib/auditoria';
import { ehErroApp } from '@/lib/erroApp';

interface Props {
  carteiraId: number;
  mes: string;
  /** "Baixar Word" no arquivo enviado; "Baixar a prévia" antes do envio. */
  rotulo: string;
  tamanho?: 'sm' | 'lg';
}

/**
 * Monta o Word do arquivo do mês no navegador e baixa (E14). Mostra que está gerando, o nome do
 * arquivo que saiu e, se falhar, o motivo.
 */
export function BaixarWord({ carteiraId, mes, rotulo, tamanho = 'lg' }: Readonly<Props>) {
  const baixar = useMutation({
    mutationFn: async () => {
      const nome = await baixarWord(carteiraId, mes);
      registrarAcao('baixou_arquivo_word', `${String(carteiraId)}:${mes}`, { arquivo: nome });
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
        {baixar.isPending ? 'Gerando o Word…' : rotulo}
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
            : 'Não foi possível gerar o Word. Tente de novo.'}
        </p>
      )}
    </div>
  );
}
