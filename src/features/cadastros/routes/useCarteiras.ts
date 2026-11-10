import { useQueries } from '@tanstack/react-query';

import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import { type CarteiraNaTela, montarCarteiras } from '@/features/cadastros/carteiras';
import type { ConsultaDaSecao } from '@/features/cadastros/components/SecaoDoCadastro';
import { carteirasOptions, pessoasOptions, unidadesOptions } from '@/features/cadastros/queries';

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
      const todas = [carteiras, unidades, pessoas];
      const falha = todas.find((consulta) => consulta.isError);
      const dados =
        carteiras.data === undefined || unidades.data === undefined || pessoas.data === undefined
          ? undefined
          : {
              carteiras: montarCarteiras(carteiras.data, unidades.data, pessoas.data),
              unidades: unidades.data,
              pessoas: pessoas.data,
            };
      const consulta: ConsultaDaSecao = {
        isPending: falha === undefined && dados === undefined,
        isError: falha !== undefined,
        error: falha?.error ?? null,
        data: dados?.carteiras,
        refetch: () => Promise.all(todas.map((uma) => uma.refetch())),
      };
      return { consulta, dados };
    },
  });
}
