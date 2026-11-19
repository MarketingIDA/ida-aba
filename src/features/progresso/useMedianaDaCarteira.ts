import { useQuery } from '@tanstack/react-query';

import { carteiraOptions } from '@/features/progresso/queries';
import { type MedianaDaCarteira, medianaDaCarteira } from '@dominio/mediana.ts';
import type { Progresso } from '@dominio/progresso.ts';

/** Com menos de dois assistidos lidos não há com quem comparar. */
const MINIMO_PARA_COMPARAR = 2;

/**
 * A mediana da carteira na janela do assistido, ou `null` enquanto carrega, se falhar ou se não
 * houver com quem comparar: a linha do assistido aparece sozinha, sem tirar a tela do ar.
 */
export function useMedianaDaCarteira(
  assistidoId: number,
  progresso: Progresso | null,
): MedianaDaCarteira | null {
  const inicio = progresso?.inicio ?? '';
  const fim = progresso?.fim ?? '';
  const carteira = useQuery({
    ...carteiraOptions(assistidoId, inicio, fim),
    enabled: progresso !== null,
  });
  if (progresso === null || carteira.data === undefined) return null;
  const mediana = medianaDaCarteira(carteira.data, inicio, fim);
  return mediana.assistidos < MINIMO_PARA_COMPARAR ? null : mediana;
}
