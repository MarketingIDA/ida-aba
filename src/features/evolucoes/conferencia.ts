import type { Devolucao } from '@/features/evolucoes/api/devolucao.api';
import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import type { TextoAnterior } from '@/features/evolucoes/api/anterior.api';
import type { Lacuna } from '@/features/evolucoes/api/lacunas.api';
import { plural } from '@/features/evolucoes/logica';
import {
  linhasDoTexto,
  MINIMO_DE_LINHAS,
  MINIMO_DE_METAS_DO_MES,
  textoDaEvolucao,
} from '@dominio/evolucao.ts';
import { citaFrequencia, LIMITE_DA_FREQUENCIA } from '@dominio/frequencia.ts';
import { nomeDoMes } from '@dominio/mes.ts';
import { LIMITE_DE_SEMELHANCA, semelhanca } from '@dominio/semelhanca.ts';
import { type MetaComPrograma, metaJaAlcancada, metaSemProgramaNoTexto } from '@dominio/metas.ts';

/** E11: menos de 4 metas alcançadas no mês é alerta, não bloqueio. */
export const MINIMO_DE_ALCANCADAS = 4;

/** O título de cada parte, como sai no documento. */
export const TITULO_DA_PARTE: Record<NumeroDaParte, string> = {
  1: 'Identificação',
  2: 'Evolução mensal',
  3: 'Metas alcançadas',
  4: 'Metas para o mês atual',
};

export const NUMEROS: readonly NumeroDaParte[] = [1, 2, 3, 4];

/** O que a conferência lê fora da evolução. Enquanto não chega, a tela não bloqueia; o banco confere. */
export interface ContextoDaConferencia {
  /** As metas do cadastro já alcançadas ou em manutenção (E12). */
  jaAlcancadas?: readonly string[];
  /** Os programas do plano que não aparecem nas análises (E10). */
  lacunas?: readonly Lacuna[];
  /** O texto da evolução do mês anterior (P7). */
  anterior?: TextoAnterior | null;
  /** A frequência do período, em %, pelo PDF do Tita (E04); `null` sem importação. */
  frequencia?: number | null;
  /** As metas em desenvolvimento do cadastro, com o programa (E12). */
  metasComPrograma?: readonly MetaComPrograma[];
}

export function linhasDa(evolucao: Evolucao): number {
  return evolucao.texto === null ? 0 : linhasDoTexto(evolucao.texto.conteudo);
}

/**
 * O que impede conferir a parte, ou `null`. São as regras que o banco cobra ao concluir (E09,
 * E10, E12): a tela avisa na parte, antes de a conclusão ser recusada.
 */
export function pendenciaDaParte(
  evolucao: Evolucao,
  numero: NumeroDaParte,
  contexto: ContextoDaConferencia = {},
): string | null {
  if (numero === 1) {
    return evolucao.plano === null
      ? 'O plano de saúde está em branco no cadastro. Peça a correção à coordenação geral.'
      : null;
  }
  if (numero === 2) return pendenciaDoTexto(evolucao, contexto.lacunas ?? []);
  if (numero === 4) return pendenciaDasMetasDoMes(evolucao, contexto.jaAlcancadas ?? []);
  return null;
}

/** E10: 7 linhas ou mais, e nenhuma lacuna aberta. */
function pendenciaDoTexto(evolucao: Evolucao, lacunas: readonly Lacuna[]) {
  const linhas = linhasDa(evolucao);
  if (linhas < MINIMO_DE_LINHAS) {
    return `O texto tem ${plural(linhas, 'linha', 'linhas')}; o mínimo é ${String(MINIMO_DE_LINHAS)}.`;
  }
  const abertas = lacunas.filter((l) => l.situacao === 'aberta').length;
  return abertas === 0
    ? null
    : `${plural(abertas, 'lacuna aberta', 'lacunas abertas')}: resolva cada programa que não aparece nas análises.`;
}

/**
 * E12: 4 metas ou mais, e nenhuma já alcançada, no cadastro (alcançada ou em manutenção) ou na
 * parte 3 deste mês.
 */
function pendenciaDasMetasDoMes(evolucao: Evolucao, jaAlcancadas: readonly string[]) {
  const metas = evolucao.metasDoMes?.conteudo.metas ?? [];
  if (metas.length < MINIMO_DE_METAS_DO_MES) {
    return `São ${plural(metas.length, 'meta', 'metas')}; o mínimo é ${String(MINIMO_DE_METAS_DO_MES)}.`;
  }
  const alcancadas = [...jaAlcancadas, ...(evolucao.metasAlcancadas?.conteudo.metas ?? [])];
  const repetida = metaJaAlcancada(metas, alcancadas);
  return repetida === null
    ? null
    : `A meta "${repetida}" já foi alcançada; tire-a das metas para o mês atual.`;
}

/** O que a parte deve olhar sem impedir a conferência (E11, E12), ou `null`. */
export function avisoDaParte(
  evolucao: Evolucao,
  numero: NumeroDaParte,
  contexto: ContextoDaConferencia = {},
): string | null {
  if (numero === 2) {
    const avisos = [
      avisoDaFrequencia(evolucao, contexto.frequencia ?? null),
      avisoDoTexto(evolucao, contexto.anterior ?? null),
    ].filter((aviso) => aviso !== null);
    return avisos.length === 0 ? null : avisos.join(' ');
  }
  if (numero === 4) {
    return (
      avisoDasMetasDoMes(evolucao, contexto.lacunas ?? []) ??
      avisoDoProgramaNoTexto(evolucao, contexto.metasComPrograma ?? [])
    );
  }
  if (numero !== 3) return null;
  const alcancadas = evolucao.metasAlcancadas?.conteudo.metas.length ?? 0;
  return alcancadas < MINIMO_DE_ALCANCADAS
    ? `${plural(alcancadas, 'meta alcançada', 'metas alcançadas')} no mês; o esperado é ${String(MINIMO_DE_ALCANCADAS)} ou mais. Não impede a conclusão.`
    : null;
}

/** E04: frequência abaixo de 75% que a abertura não cita. */
function avisoDaFrequencia(evolucao: Evolucao, frequencia: number | null): string | null {
  if (frequencia === null || frequencia >= LIMITE_DA_FREQUENCIA || evolucao.texto === null) {
    return null;
  }
  return citaFrequencia(evolucao.texto.conteudo.abertura, frequencia)
    ? null
    : `A frequência do período foi de ${String(frequencia)}%, abaixo de ${String(LIMITE_DA_FREQUENCIA)}%, e a abertura não a cita. Cite a frequência na abertura. Não impede a conclusão.`;
}

/** P7: o texto 60% ou mais parecido com o da evolução do mês anterior. */
function avisoDoTexto(evolucao: Evolucao, anterior: TextoAnterior | null): string | null {
  if (anterior === null || evolucao.texto === null) return null;
  const parecido = semelhanca(textoDaEvolucao(evolucao.texto.conteudo), anterior.texto);
  return parecido < LIMITE_DE_SEMELHANCA
    ? null
    : `O texto está ${String(parecido)}% parecido com o da evolução de ${nomeDoMes(anterior.mesRef)}. Conte o que mudou neste mês. Não impede a conclusão.`;
}

/** E12: meta de um programa cuja lacuna foi ignorada, que continua nas metas para o mês atual. */
function avisoDasMetasDoMes(evolucao: Evolucao, lacunas: readonly Lacuna[]): string | null {
  const metas = evolucao.metasDoMes?.conteudo.metas ?? [];
  for (const lacuna of lacunas.filter((l) => l.situacao === 'ignorada')) {
    const meta = metaJaAlcancada(metas, lacuna.metas);
    if (meta !== null) {
      return `A meta "${meta}" é do programa ${lacuna.programa}, que não aparece nas análises e teve a lacuna ignorada.`;
    }
  }
  return null;
}

/** E12: meta para o mês atual cujo programa o texto da evolução mensal não cita. */
function avisoDoProgramaNoTexto(
  evolucao: Evolucao,
  metasComPrograma: readonly MetaComPrograma[],
): string | null {
  if (evolucao.texto === null) return null;
  const meta = metaSemProgramaNoTexto(
    evolucao.metasDoMes?.conteudo.metas ?? [],
    metasComPrograma,
    textoDaEvolucao(evolucao.texto.conteudo),
  );
  return meta === null
    ? null
    : `A meta "${meta.texto}" é do programa ${meta.programa}, que o texto da evolução mensal não cita. Não impede a conclusão.`;
}

export function conferidas(evolucao: Evolucao): number {
  return evolucao.partes.filter((p) => p.conferidaEm !== null).length;
}

/** A devolução à espera de o coordenador resolver (E13), ou `null`. */
export function devolucaoAberta(evolucao: Evolucao): Devolucao | null {
  return evolucao.devolucoes.find((d) => d.resolvidaEm === null) ?? null;
}

/** Pronta para concluir: as 4 partes conferidas, nenhuma pendência e nenhuma devolução aberta. */
export function prontaParaConcluir(
  evolucao: Evolucao,
  contexto: ContextoDaConferencia = {},
): boolean {
  return (
    conferidas(evolucao) === 4 &&
    devolucaoAberta(evolucao) === null &&
    NUMEROS.every((n) => pendenciaDaParte(evolucao, n, contexto) === null)
  );
}
