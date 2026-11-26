import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { nomeDoWordDaEvolucao, wordDaEvolucao } from '@/features/evolucoes/word/baixarEvolucao';
import { registrarAcao } from '@/lib/auditoria';
import { salvarArquivo } from '@/utils/salvarArquivo';

/**
 * Baixar a evolução de um assistido em Word, para conferência (E14). Quem abre a evolução (o
 * coordenador e a coordenação geral) baixa; ela não vai sozinha a contas médicas.
 */
export function BaixarEvolucao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const baixar = useMutation({
    mutationFn: async () => {
      const nome = nomeDoWordDaEvolucao(evolucao);
      salvarArquivo(await wordDaEvolucao(evolucao), nome);
      registrarAcao('baixou_evolucao_word', evolucao.id, { arquivo: nome });
      return nome;
    },
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={evolucao.texto === null || baixar.isPending}
        onClick={() => {
          baixar.mutate();
        }}
      >
        <Download aria-hidden="true" />
        {baixar.isPending ? 'Gerando o Word…' : 'Baixar para conferência (Word)'}
      </Button>
      {baixar.isSuccess && (
        <p role="status" className="text-caption font-semibold text-texto-2">
          Baixado: {baixar.data}. Não vai a contas médicas: o que vai é o arquivo do mês.
        </p>
      )}
      {baixar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          Não foi possível gerar o Word. Tente de novo.
        </p>
      )}
    </div>
  );
}
