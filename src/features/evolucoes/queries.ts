import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ConteudoDaParte,
  buscarEvolucao,
  conferirParte,
  criarEvolucao,
  mudarSituacao,
  type NumeroDaParte,
  salvarParte,
} from '@/features/evolucoes/api/evolucao.api';
import { buscarCoordenadores, buscarEvolucoesDoMes } from '@/features/evolucoes/api/evolucoes.api';

export const evolucoesKeys = {
  all: ['evolucoes'] as const,
  doMes: (mesRef: string) => [...evolucoesKeys.all, 'mes', mesRef] as const,
  coordenadores: () => [...evolucoesKeys.all, 'coordenadores'] as const,
  evolucao: (id: string) => [...evolucoesKeys.all, 'evolucao', id] as const,
};

export const evolucoesDoMesOptions = (mesRef: string) =>
  queryOptions({
    queryKey: evolucoesKeys.doMes(mesRef),
    queryFn: () => buscarEvolucoesDoMes(mesRef),
  });

/** A lista de coordenadores muda pouco: vale por 5 minutos. */
export const coordenadoresOptions = () =>
  queryOptions({
    queryKey: evolucoesKeys.coordenadores(),
    queryFn: buscarCoordenadores,
    staleTime: 5 * 60_000,
  });

export const evolucaoOptions = (id: string) =>
  queryOptions({ queryKey: evolucoesKeys.evolucao(id), queryFn: () => buscarEvolucao(id) });

/** Nova evolução: a lista do mês volta do banco com ela. */
export function useCriarEvolucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarEvolucao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.all }),
  });
}

/**
 * Gravar uma parte, conferir, concluir e reabrir. Depois de cada uma, deu certo ou não, a
 * evolução e a lista do mês voltam do banco: a tela mostra o que ficou gravado.
 */
export function useAlterarEvolucao(id: string) {
  const queryClient = useQueryClient();
  const recarregar = () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.all });
  return {
    salvar: useMutation({
      mutationFn: (parte: ConteudoDaParte) => salvarParte(id, parte),
      onSettled: recarregar,
    }),
    conferir: useMutation({
      mutationFn: ({ numero, conferida }: { numero: NumeroDaParte; conferida: boolean }) =>
        conferirParte(id, numero, conferida),
      onSettled: recarregar,
    }),
    situacao: useMutation({
      mutationFn: (situacao: 'concluida' | 'em_conferencia') => mudarSituacao(id, situacao),
      onSettled: recarregar,
    }),
  };
}
