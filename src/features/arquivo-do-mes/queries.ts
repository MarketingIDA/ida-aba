import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  buscarArquivosDoMes,
  buscarEvolucoesDoArquivo,
  enviarArquivo,
} from '@/features/arquivo-do-mes/api/arquivos.api';

export const arquivosKeys = {
  all: ['arquivos'] as const,
  doMes: (mesRef: string) => [...arquivosKeys.all, 'mes', mesRef] as const,
  evolucoes: (arquivoId: number) => [...arquivosKeys.all, 'evolucoes', arquivoId] as const,
};

export const arquivosDoMesOptions = (mesRef: string) =>
  queryOptions({
    queryKey: arquivosKeys.doMes(mesRef),
    queryFn: () => buscarArquivosDoMes(mesRef),
  });

/** O arquivo enviado não muda mais: a lista de evoluções dele vale por 5 minutos. */
export const evolucoesDoArquivoOptions = (arquivoId: number) =>
  queryOptions({
    queryKey: arquivosKeys.evolucoes(arquivoId),
    queryFn: () => buscarEvolucoesDoArquivo(arquivoId),
    staleTime: 5 * 60_000,
  });

/**
 * Enviar o arquivo do mês. Deu certo ou não, tudo volta do banco: o envio muda o arquivo e a
 * situação de cada evolução da carteira, e a tela mostra o que ficou gravado.
 */
export function useEnviarArquivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviarArquivo,
    onSettled: () => queryClient.invalidateQueries(),
  });
}
