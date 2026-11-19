import { useQuery } from '@tanstack/react-query';

import { fontesOptions } from '@/features/evolucoes/api/fontes.api';
import { FontesDaParte } from '@/features/evolucoes/components/FontesDaParte';

/** As fontes da parte, da consulta única da evolução (E06). Sem fontes, nada aparece. */
export function Fontes({
  evolucaoId,
  numero,
}: Readonly<{ evolucaoId: string; numero: 2 | 3 | 4 }>) {
  const consulta = useQuery(fontesOptions(evolucaoId));
  return <FontesDaParte fontes={(consulta.data ?? []).filter((f) => f.numero === numero)} />;
}
