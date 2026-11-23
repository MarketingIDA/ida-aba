import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import {
  avisoDaParte,
  type ContextoDaConferencia,
  conferidas,
  devolucaoAberta,
  NUMEROS,
  pendenciaDaParte,
} from '@/features/evolucoes/conferencia';

/** O resumo das conferências para as etapas, a caixa de situação e a barra da evolução. */
export interface ResumoDaConferencia {
  conferidas: number;
  /** As partes com algo que impede conferir. */
  comBloqueio: readonly NumeroDaParte[];
  devolucao: boolean;
  /** Partes com alerta, mais os alertas do PDF do Tita sem ciência (E19). */
  alertas: number;
  /** A primeira parte ainda não conferida, ou `null`. */
  aConferir: NumeroDaParte | null;
}

export function resumoDaConferencia(
  evolucao: Evolucao,
  contexto: ContextoDaConferencia,
): ResumoDaConferencia {
  const conferida = (n: NumeroDaParte) =>
    evolucao.partes.some((p) => p.numero === n && p.conferidaEm !== null);
  return {
    conferidas: conferidas(evolucao),
    comBloqueio: NUMEROS.filter((n) => pendenciaDaParte(evolucao, n, contexto) !== null),
    devolucao: devolucaoAberta(evolucao) !== null,
    alertas:
      NUMEROS.filter((n) => avisoDaParte(evolucao, n, contexto) !== null).length +
      (contexto.alertasSemCiencia ?? 0),
    aConferir: NUMEROS.find((n) => !conferida(n)) ?? null,
  };
}

/** Leva à parte: rola até o card e põe o foco no título, para o leitor de tela seguir. */
export function irParaParte(numero: NumeroDaParte): void {
  const parte = document.getElementById(`p-${String(numero)}`);
  parte?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  parte?.focus({ preventScroll: true });
}
