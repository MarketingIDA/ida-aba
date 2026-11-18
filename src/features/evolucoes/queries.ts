import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { devolverEvolucao, resolverDevolucao } from '@/features/evolucoes/api/devolucao.api';
import {
  alterarDocumento,
  buscarDocumentos,
  juntarDocumento,
} from '@/features/evolucoes/api/documentos.api';
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
import { buscarImportacao, gravarImportacao } from '@/features/evolucoes/api/importacao.api';
import { gerarRascunho } from '@/features/evolucoes/api/rascunho.api';
import type { Leitura } from '@/features/evolucoes/tita/leitura';
import type { DocumentoConferido } from '@dominio/documentos.ts';

export const evolucoesKeys = {
  all: ['evolucoes'] as const,
  doMes: (mesRef: string) => [...evolucoesKeys.all, 'mes', mesRef] as const,
  coordenadores: () => [...evolucoesKeys.all, 'coordenadores'] as const,
  evolucao: (id: string) => [...evolucoesKeys.all, 'evolucao', id] as const,
  importacao: (id: string) => [...evolucoesKeys.all, 'importacao', id] as const,
  documentos: (id: string) => [...evolucoesKeys.all, 'documentos', id] as const,
};

export const documentosOptions = (evolucaoId: string) =>
  queryOptions({
    queryKey: evolucoesKeys.documentos(evolucaoId),
    queryFn: () => buscarDocumentos(evolucaoId),
  });

/** Juntar, mudar e tirar documentos: deu certo ou não, a lista volta do banco. */
export function useAlterarDocumentos(evolucaoId: string) {
  const queryClient = useQueryClient();
  const recarregar = () =>
    queryClient.invalidateQueries({ queryKey: evolucoesKeys.documentos(evolucaoId) });
  return {
    juntar: useMutation({
      mutationFn: ({
        documento,
        confirmado,
      }: {
        documento: DocumentoConferido;
        confirmado: boolean;
      }) => juntarDocumento(evolucaoId, documento, confirmado),
      onSettled: recarregar,
    }),
    alterar: useMutation({
      mutationFn: ({
        id,
        mudanca,
      }: {
        id: number;
        mudanca: Parameters<typeof alterarDocumento>[1];
      }) => alterarDocumento(id, mudanca),
      onSettled: recarregar,
    }),
  };
}

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

export const importacaoOptions = (evolucaoId: string) =>
  queryOptions({
    queryKey: evolucoesKeys.importacao(evolucaoId),
    queryFn: () => buscarImportacao(evolucaoId),
  });

/** Importar o PDF do Tita: a evolução (a origem muda) e a importação voltam do banco. */
export function useImportarTita(evolucaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arquivo, leitura }: { arquivo: string; leitura: Leitura }) =>
      gravarImportacao(evolucaoId, arquivo, leitura),
    onSettled: () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.all }),
  });
}

/** Rascunho pela IA: deu certo ou não, a evolução volta do banco com o que ficou gravado. */
export function useGerarRascunho(evolucaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gerarRascunho(evolucaoId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.all }),
  });
}

/** Nova evolução: a lista do mês volta do banco com ela. */
export function useCriarEvolucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarEvolucao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.all }),
  });
}

/** Devolver com o motivo (coordenação geral): a evolução volta do banco em conferência. */
export function useDevolverEvolucao(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motivo: string) => devolverEvolucao(id, motivo),
    onSettled: () => queryClient.invalidateQueries({ queryKey: evolucoesKeys.all }),
  });
}

/**
 * Gravar uma parte, conferir, resolver a devolução, concluir e reabrir. Depois de cada uma, deu certo ou não, a
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
    resolver: useMutation({ mutationFn: resolverDevolucao, onSettled: recarregar }),
  };
}
