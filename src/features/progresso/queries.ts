import { queryOptions } from '@tanstack/react-query';

import { buscarDadosDoProgresso } from '@/features/progresso/api/progresso.api';

export const progressoKeys = {
  all: ['progresso'] as const,
  doAssistido: (assistidoId: number) => [...progressoKeys.all, assistidoId] as const,
};

export const progressoOptions = (assistidoId: number) =>
  queryOptions({
    queryKey: progressoKeys.doAssistido(assistidoId),
    queryFn: () => buscarDadosDoProgresso(assistidoId),
  });
