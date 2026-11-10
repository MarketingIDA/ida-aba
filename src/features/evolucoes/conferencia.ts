import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import { plural } from '@/features/evolucoes/logica';
import { linhasDoTexto, MINIMO_DE_LINHAS, MINIMO_DE_METAS_DO_MES } from '@dominio/evolucao.ts';

/** O título de cada parte, como sai no documento. */
export const TITULO_DA_PARTE: Record<NumeroDaParte, string> = {
  1: 'Identificação',
  2: 'Evolução mensal',
  3: 'Metas alcançadas',
  4: 'Metas para o mês atual',
};

export const NUMEROS: readonly NumeroDaParte[] = [1, 2, 3, 4];

export function linhasDa(evolucao: Evolucao): number {
  return evolucao.texto === null ? 0 : linhasDoTexto(evolucao.texto.conteudo);
}

/**
 * O que impede conferir a parte, ou `null`. São as regras que o banco cobra ao concluir (E09,
 * E10, E12): a tela avisa na parte, antes de a conclusão ser recusada.
 */
export function pendenciaDaParte(evolucao: Evolucao, numero: NumeroDaParte): string | null {
  if (numero === 1) {
    return evolucao.plano === null
      ? 'O plano de saúde está em branco no cadastro. Peça a correção à coordenação geral.'
      : null;
  }
  if (numero === 2) {
    const linhas = linhasDa(evolucao);
    return linhas < MINIMO_DE_LINHAS
      ? `O texto tem ${plural(linhas, 'linha', 'linhas')}; o mínimo é ${String(MINIMO_DE_LINHAS)}.`
      : null;
  }
  if (numero === 4) {
    const metas = evolucao.metasDoMes?.conteudo.metas.length ?? 0;
    return metas < MINIMO_DE_METAS_DO_MES
      ? `São ${plural(metas, 'meta', 'metas')}; o mínimo é ${String(MINIMO_DE_METAS_DO_MES)}.`
      : null;
  }
  return null;
}

export function conferidas(evolucao: Evolucao): number {
  return evolucao.partes.filter((p) => p.conferidaEm !== null).length;
}

/** Pronta para concluir: as 4 partes conferidas e nenhuma pendência. */
export function prontaParaConcluir(evolucao: Evolucao): boolean {
  return conferidas(evolucao) === 4 && NUMEROS.every((n) => pendenciaDaParte(evolucao, n) === null);
}
