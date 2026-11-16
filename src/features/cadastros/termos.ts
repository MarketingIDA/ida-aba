import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { buscarTermos, type DadosDoTermo, salvarTermo } from '@/features/cadastros/api/termos.api';

/** Um espaço só entre as palavras: o banco não repete o termo que só muda no espaço. */
const comUmEspaco = (texto: string) => texto.replaceAll(/\s+/g, ' ');

/** As regras do formulário, as mesmas dos `check` do banco (que tem a última palavra). */
export const esquemaDoTermo = z.object({
  termo: z
    .string()
    .trim()
    .min(2, 'Escreva o termo, com 2 letras ou mais.')
    .max(60, 'O termo pode ter até 60 letras.')
    .transform(comUmEspaco),
  substituto: z
    .string()
    .trim()
    .min(2, 'Escreva o termo técnico que entra no lugar, com 2 letras ou mais.')
    .max(120, 'O substituto pode ter até 120 letras.')
    .transform(comUmEspaco),
  ativo: z.boolean(),
});

/** A mesma raiz da lista que a evolução lê: salvar aqui atualiza o alerta de lá. */
export const termosKeys = { all: ['termos-inadequados'] as const };

export const termosOptions = () =>
  queryOptions({ queryKey: termosKeys.all, queryFn: buscarTermos });

/** Depois de salvar, a lista volta do banco: é ele quem diz como ficou. */
export function useSalvarTermo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dados, id }: { dados: DadosDoTermo; id?: number | undefined }) =>
      salvarTermo(dados, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: termosKeys.all }),
  });
}
