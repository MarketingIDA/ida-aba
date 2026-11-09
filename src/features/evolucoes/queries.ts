import { queryOptions } from '@tanstack/react-query';

import { buscarCoordenadores, buscarEvolucoesDoMes } from '@/features/evolucoes/api/evolucoes.api';

export const evolucoesKeys = {
  all: ['evolucoes'] as const,
  doMes: (mesRef: string) => [...evolucoesKeys.all, 'mes', mesRef] as const,
  coordenadores: () => [...evolucoesKeys.all, 'coordenadores'] as const,
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
