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
  buscarPessoas,
  type DadosDaPessoa,
  salvarPessoa,
} from '@/features/cadastros/api/pessoas.api';

export const cadastrosKeys = {
  all: ['cadastros'] as const,
  unidades: () => [...cadastrosKeys.all, 'unidades'] as const,
  planos: () => [...cadastrosKeys.all, 'planos'] as const,
  pessoas: () => [...cadastrosKeys.all, 'pessoas'] as const,
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
