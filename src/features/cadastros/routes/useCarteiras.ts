import { useQueries } from '@tanstack/react-query';

import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import { type CarteiraNaTela, montarCarteiras } from '@/features/cadastros/carteiras';
import type { ConsultaDaSecao } from '@/features/cadastros/components/SecaoDoCadastro';
import { carteirasOptions, pessoasOptions, unidadesOptions } from '@/features/cadastros/queries';

interface UmaConsulta {
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/**
 * Várias consultas lidas como uma pela seção: pendente até a lista existir, a falha de uma é a da
 * seção, e "Tentar de novo" busca todas.
 */
export function consultaDaSoma(
  todas: readonly UmaConsulta[],
  lista: readonly unknown[] | undefined,
): ConsultaDaSecao {
  const falha = todas.find((consulta) => consulta.isError);
  return {
    isPending: falha === undefined && lista === undefined,
    isError: falha !== undefined,
    error: falha?.error ?? null,
    data: lista,
    refetch: () => Promise.all(todas.map((consulta) => consulta.refetch())),
  };
}

export interface DadosDasCarteiras {
  carteiras: CarteiraNaTela[];
  unidades: Unidade[];
  pessoas: Pessoa[];
}

/**
 * Carteiras, unidades e pessoas juntas: a lista e o formulário só aparecem com as três (o
 * `select` montado antes das opções mostraria uma pessoa e guardaria outra). A falha de uma é a
 * da seção, e "Tentar de novo" busca as três.
 */
export function useCarteiras(): {
  consulta: ConsultaDaSecao;
  dados: DadosDasCarteiras | undefined;
} {
  return useQueries({
    queries: [carteirasOptions(), unidadesOptions(), pessoasOptions()],
    combine: ([carteiras, unidades, pessoas]) => {
      const dados =
        carteiras.data === undefined || unidades.data === undefined || pessoas.data === undefined
          ? undefined
          : {
              carteiras: montarCarteiras(carteiras.data, unidades.data, pessoas.data),
              unidades: unidades.data,
              pessoas: pessoas.data,
            };
      const consulta = consultaDaSoma([carteiras, unidades, pessoas], dados?.carteiras);
      return { consulta, dados };
    },
  });
}
