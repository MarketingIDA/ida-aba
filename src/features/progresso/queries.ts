import { queryOptions } from '@tanstack/react-query';

import {
  buscarDadosDoProgresso,
  buscarIndependenciaDaCarteira,
} from '@/features/progresso/api/progresso.api';

export const progressoKeys = {
  all: ['progresso'] as const,
  doAssistido: (assistidoId: number) => [...progressoKeys.all, assistidoId] as const,
  carteira: (assistidoId: number, inicio: string, fim: string) =>
    [...progressoKeys.all, assistidoId, 'carteira', inicio, fim] as const,
};

export const progressoOptions = (assistidoId: number) =>
  queryOptions({
    queryKey: progressoKeys.doAssistido(assistidoId),
    queryFn: () => buscarDadosDoProgresso(assistidoId),
  });

/** A base da mediana da carteira na janela do assistido (E27). */
export const carteiraOptions = (assistidoId: number, inicio: string, fim: string) =>
  queryOptions({
    queryKey: progressoKeys.carteira(assistidoId, inicio, fim),
    queryFn: () => buscarIndependenciaDaCarteira(assistidoId, inicio, fim),
  });
