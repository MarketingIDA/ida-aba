import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import {
  buscarMetas,
  type DadosDaMeta,
  type Meta,
  salvarMeta,
  SITUACOES_DA_META,
  type SituacaoDaMeta,
} from '@/features/cadastros/api/metas.api';

/** Rótulo e cor fixa de cada situação da meta (E23). */
export const SITUACAO_DA_META: Record<
  SituacaoDaMeta,
  { rotulo: string; plural: string; tom: 'info' | 'ok' | 'neutro' }
> = {
  desenvolvimento: { rotulo: 'Em desenvolvimento', plural: 'Em desenvolvimento', tom: 'info' },
  alcancada: { rotulo: 'Alcançada', plural: 'Alcançadas', tom: 'ok' },
  manutencao: { rotulo: 'Em manutenção', plural: 'Em manutenção', tom: 'ok' },
  suspensa: { rotulo: 'Suspensa', plural: 'Suspensas', tom: 'neutro' },
};

/** Os limites são os do banco; o texto da meta cabe numa meta da evolução (500 letras). */
export const esquemaMeta = z.object({
  programa: z
    .string()
    .trim()
    .refine(
      (texto) => texto === '' || (texto.length >= 2 && texto.length <= 80),
      'Escreva o programa com 2 a 80 letras, ou deixe em branco.',
    )
    .transform((texto) => (texto === '' ? null : texto)),
  texto: z
    .string()
    .trim()
    .min(5, 'Escreva a meta com 5 letras ou mais.')
    .max(500, 'A meta passa de 500 letras.'),
  criterio: z
    .string()
    .trim()
    .min(3, 'Escreva o critério de alcance.')
    .max(300, 'O critério passa de 300 letras.'),
  situacao: z.enum(SITUACOES_DA_META),
});

export const metasKeys = {
  all: ['metas'] as const,
  doAssistido: (assistidoId: number) => [...metasKeys.all, assistidoId] as const,
};

/** Todas as metas que quem está na tela pode ler, para a contagem por assistido. */
export const todasAsMetasOptions = () =>
  queryOptions({ queryKey: metasKeys.all, queryFn: () => buscarMetas() });

export const metasDoAssistidoOptions = (assistidoId: number) =>
  queryOptions({
    queryKey: metasKeys.doAssistido(assistidoId),
    queryFn: () => buscarMetas(assistidoId),
  });

/** Meta nova ou alterada: as listas de metas voltam do banco. */
export function useSalvarMeta(assistidoId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dados, id }: { dados: DadosDaMeta; id?: number | undefined }) =>
      salvarMeta(assistidoId, dados, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: metasKeys.all }),
  });
}

/** Quantas metas há em cada situação. */
export function contarMetas(metas: readonly Meta[]): Record<SituacaoDaMeta, number> {
  const contagem = { desenvolvimento: 0, alcancada: 0, manutencao: 0, suspensa: 0 };
  for (const meta of metas) contagem[meta.situacao] += 1;
  return contagem;
}
