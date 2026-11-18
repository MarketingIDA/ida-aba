import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  aprovarDica,
  buscarDicas,
  buscarOrientacoes,
  descartarDica,
  mudarOrientacao,
} from '@/features/orientacoes/api/orientacoes.api';

export const orientacoesKeys = {
  all: ['orientacoes-ia'] as const,
  dicas: () => [...orientacoesKeys.all, 'dicas'] as const,
  orientacoes: () => [...orientacoesKeys.all, 'orientacoes'] as const,
};

export const dicasOptions = () =>
  queryOptions({ queryKey: orientacoesKeys.dicas(), queryFn: buscarDicas });

export const orientacoesOptions = () =>
  queryOptions({ queryKey: orientacoesKeys.orientacoes(), queryFn: buscarOrientacoes });

/**
 * Aprovar, descartar e retirar. Depois de cada uma, deu certo ou não, as dicas e as orientações
 * voltam do banco: a tela mostra o que ficou gravado.
 */
export function useCuradoria() {
  const queryClient = useQueryClient();
  const recarregar = () => queryClient.invalidateQueries({ queryKey: orientacoesKeys.all });
  return {
    aprovar: useMutation({
      mutationFn: ({ id, texto }: { id: number; texto: string }) => aprovarDica(id, texto),
      onSettled: recarregar,
    }),
    descartar: useMutation({
      mutationFn: ({ id, motivo }: { id: number; motivo: string }) => descartarDica(id, motivo),
      onSettled: recarregar,
    }),
    mudar: useMutation({
      mutationFn: ({ id, ativa }: { id: number; ativa: boolean }) => mudarOrientacao(id, ativa),
      onSettled: recarregar,
    }),
  };
}

export type Curadoria = ReturnType<typeof useCuradoria>;
