import { useQuery } from '@tanstack/react-query';

import { fontesOptions } from '@/features/evolucoes/api/fontes.api';
import { FontesDaEscritaAMao } from '@/features/evolucoes/components/FontesDaEscritaAMao';
import { FontesDaParte } from '@/features/evolucoes/components/FontesDaParte';

interface Props {
  evolucaoId: string;
  numero: 2 | 3 | 4;
}

/** As fontes da parte escrita pela IA, da consulta única da evolução (E06). Sem fontes, nada. */
function FontesDaIA({ evolucaoId, numero }: Readonly<Props>) {
  const consulta = useQuery(fontesOptions(evolucaoId));
  return <FontesDaParte fontes={(consulta.data ?? []).filter((f) => f.numero === numero)} />;
}

/**
 * As fontes da parte: as sessões e os documentos de cada frase da IA (E06, E25) ou, na evolução
 * escrita à mão, o que o coordenador escreveu (E26).
 */
export function Fontes({ manual, ...props }: Readonly<Props & { manual: boolean }>) {
  return manual ? <FontesDaEscritaAMao {...props} /> : <FontesDaIA {...props} />;
}
