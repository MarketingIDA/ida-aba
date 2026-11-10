import { useQueries } from '@tanstack/react-query';

import type { Plano } from '@/features/cadastros/api/cadastros.api';
import { type AssistidoNaTela, montarAssistidos } from '@/features/cadastros/assistidos';
import { type CarteiraNaTela, montarCarteiras } from '@/features/cadastros/carteiras';
import type { ConsultaDaSecao } from '@/features/cadastros/components/SecaoDoCadastro';
import {
  assistidosOptions,
  carteirasOptions,
  pessoasOptions,
  planosOptions,
  unidadesOptions,
} from '@/features/cadastros/queries';
import { consultaDaSoma } from '@/features/cadastros/routes/useCarteiras';

export interface DadosDosAssistidos {
  assistidos: AssistidoNaTela[];
  carteiras: CarteiraNaTela[];
  planos: Plano[];
}

/**
 * Assistidos com a carteira (unidade, turno e quem coordena) e o plano: cinco listas, e a seção
 * só aparece com todas.
 */
export function useAssistidos(): {
  consulta: ConsultaDaSecao;
  dados: DadosDosAssistidos | undefined;
} {
  return useQueries({
    queries: [
      assistidosOptions(),
      carteirasOptions(),
      unidadesOptions(),
      pessoasOptions(),
      planosOptions(),
    ],
    combine: (todas) => {
      const [assistidos, carteiras, unidades, pessoas, planos] = todas;
      let dados: DadosDosAssistidos | undefined;
      if (
        assistidos.data !== undefined &&
        carteiras.data !== undefined &&
        unidades.data !== undefined &&
        pessoas.data !== undefined &&
        planos.data !== undefined
      ) {
        const montadas = montarCarteiras(carteiras.data, unidades.data, pessoas.data);
        dados = {
          assistidos: montarAssistidos(assistidos.data, montadas, planos.data),
          carteiras: montadas,
          planos: planos.data,
        };
      }
      return { consulta: consultaDaSoma(todas, dados?.assistidos), dados };
    },
  });
}
