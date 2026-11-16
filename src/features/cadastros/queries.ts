import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  buscarPlanos,
  buscarUnidades,
  type Plano,
  salvarPlano,
  salvarUnidade,
  type Unidade,
} from '@/features/cadastros/api/cadastros.api';
import {
  buscarAssistidos,
  type DadosDoAssistido,
  porRascunhosNaCarteira,
  salvarAssistido,
} from '@/features/cadastros/api/assistidos.api';
import {
  type AlteracaoDaCarteira,
  alterarCarteira,
  buscarCarteiras,
  cadastrarCarteira,
  type NovaCarteira,
} from '@/features/cadastros/api/carteiras.api';
import {
  buscarPessoas,
  type DadosDaPessoa,
  salvarPessoa,
} from '@/features/cadastros/api/pessoas.api';
import {
  buscarPendenciasDaTita,
  buscarUltimaSincronizacao,
  ligarUnidadeDaTita,
  sincronizarComATita,
} from '@/features/cadastros/api/tita.api';

export const cadastrosKeys = {
  all: ['cadastros'] as const,
  unidades: () => [...cadastrosKeys.all, 'unidades'] as const,
  planos: () => [...cadastrosKeys.all, 'planos'] as const,
  pessoas: () => [...cadastrosKeys.all, 'pessoas'] as const,
  carteiras: () => [...cadastrosKeys.all, 'carteiras'] as const,
  assistidos: () => [...cadastrosKeys.all, 'assistidos'] as const,
};

export const pessoasOptions = () =>
  queryOptions({ queryKey: cadastrosKeys.pessoas(), queryFn: buscarPessoas });

/**
 * A pessoa aparece em outras telas: o nome no topo, o filtro de coordenadores, o próprio acesso.
 * Depois de salvar, tudo o que está na tela volta do banco, não só a lista.
 */
export function useSalvarPessoa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valores, id }: { valores: DadosDaPessoa; id?: number | undefined }) =>
      salvarPessoa(valores, id),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export const unidadesOptions = () =>
  queryOptions({ queryKey: cadastrosKeys.unidades(), queryFn: buscarUnidades });

export const planosOptions = () =>
  queryOptions({ queryKey: cadastrosKeys.planos(), queryFn: buscarPlanos });

/** O que o formulário manda salvar: os valores e, na alteração, o `id`. */
export interface Salvamento<Linha extends { id: number }> {
  valores: Omit<Linha, 'id'>;
  id?: number | undefined;
}

/** Depois de salvar, a lista volta do banco: é ele quem diz como ficou. */
export function useSalvarUnidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valores, id }: Salvamento<Unidade>) => salvarUnidade(valores, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cadastrosKeys.unidades() }),
  });
}

export function useSalvarPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valores, id }: Salvamento<Plano>) => salvarPlano(valores, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cadastrosKeys.planos() }),
  });
}

export const carteirasOptions = () =>
  queryOptions({ queryKey: cadastrosKeys.carteiras(), queryFn: buscarCarteiras });

/** Cadastro (sem `id`) ou alteração (com `id`) de uma carteira. */
export type SalvamentoDaCarteira =
  { id?: undefined; valores: NovaCarteira } | { id: number; valores: AlteracaoDaCarteira };

/**
 * Passar a carteira muda quem vê os assistidos e as evoluções dela: depois de salvar, tudo o que
 * está na tela volta do banco, inclusive a lista do mês.
 */
export function useSalvarCarteira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (salvamento: SalvamentoDaCarteira) =>
      salvamento.id === undefined
        ? cadastrarCarteira(salvamento.valores)
        : alterarCarteira(salvamento.id, salvamento.valores),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export const assistidosOptions = () =>
  queryOptions({ queryKey: cadastrosKeys.assistidos(), queryFn: buscarAssistidos });

/** O assistido aparece na lista do mês das evoluções: depois de salvar, tudo volta do banco. */
export function useSalvarAssistido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dados, id }: { dados: DadosDoAssistido; id?: number | undefined }) =>
      salvarAssistido(dados, id),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Vários rascunhos numa carteira de uma vez: como no cadastro de um, tudo volta do banco. */
export function usePorRascunhosNaCarteira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, carteiraId }: { ids: readonly number[]; carteiraId: number }) =>
      porRascunhosNaCarteira(ids, carteiraId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export const ultimaSincronizacaoOptions = () =>
  queryOptions({
    queryKey: [...cadastrosKeys.all, 'tita', 'sincronizacao'] as const,
    queryFn: buscarUltimaSincronizacao,
  });

export const pendenciasDaTitaOptions = () =>
  queryOptions({
    queryKey: [...cadastrosKeys.all, 'tita', 'pendencias'] as const,
    queryFn: buscarPendenciasDaTita,
  });

/** A simulação não muda nada; a de verdade muda a lista de assistidos e as pendências. */
export function useSincronizarComATita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (simular: boolean) => sincronizarComATita(simular),
    onSuccess: (_resumo, simular) =>
      simular ? undefined : queryClient.invalidateQueries({ queryKey: cadastrosKeys.all }),
  });
}

export function useLigarUnidadeDaTita() {
  return useMutation({
    mutationFn: ({ nomeNaTita, unidadeId }: { nomeNaTita: string; unidadeId: number | null }) =>
      ligarUnidadeDaTita(nomeNaTita, unidadeId),
  });
}
