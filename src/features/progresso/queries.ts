import { queryOptions } from '@tanstack/react-query';

import {
  buscarDadosDoProgresso,
  buscarIndependenciaDaCarteira,
} from '@/features/progresso/api/progresso.api';
import { buscarRegistro } from '@/features/progresso/api/relatorio.api';

export const progressoKeys = {
  all: ['progresso'] as const,
  doAssistido: (assistidoId: number) => [...progressoKeys.all, assistidoId] as const,
  carteira: (assistidoId: number, inicio: string, fim: string) =>
    [...progressoKeys.all, assistidoId, 'carteira', inicio, fim] as const,
  registro: (assistidoId: number) => [...progressoKeys.all, assistidoId, 'registro'] as const,
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

/** Quem baixou, enviou ou copiou o link do relatório de metas (E28). */
export const registroOptions = (assistidoId: number) =>
  queryOptions({
    queryKey: progressoKeys.registro(assistidoId),
    queryFn: () => buscarRegistro(assistidoId),
  });
