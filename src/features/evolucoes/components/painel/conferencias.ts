import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import {
  avisoDaParte,
  type ContextoDaConferencia,
  devolucaoAberta,
  NUMEROS,
  pendenciaDaParte,
  TITULO_DA_PARTE,
} from '@/features/evolucoes/conferencia';
import { conferirLeitura } from '@/features/evolucoes/tita/leitura';

/** Uma conferência aberta da evolução, para o painel: bloqueio ou alerta, e de onde vem. */
export interface Conferencia {
  tom: 'bloq' | 'alerta';
  rotulo: string;
  texto: string;
  /** A parte, para "Ir para a parte"; `null` quando vem do PDF ou da devolução. */
  parte: NumeroDaParte | null;
}

export const DO_TITA = 'PDF do Tita';

const rotuloDaParte = (n: NumeroDaParte) => `Parte ${String(n)} · ${TITULO_DA_PARTE[n]}`;

/** Os alertas da leitura do PDF do Tita (E19), com ou sem ciência. */
export function alertasDoTita(importacao: Importacao | null, evolucao: Evolucao): string[] {
  if (importacao === null) return [];
  return conferirLeitura(importacao, evolucao.assistido, evolucao.mesRef).alertas;
}

/**
 * As conferências abertas, bloqueios primeiro: a devolução, o que impede conferir cada parte, os
 * alertas das partes e os alertas do PDF do Tita ainda sem ciência.
 */
export function conferenciasAbertas(
  evolucao: Evolucao,
  contexto: ContextoDaConferencia,
  importacao: Importacao | null,
): Conferencia[] {
  const devolucao: Conferencia[] =
    devolucaoAberta(evolucao) === null
      ? []
      : [
          {
            tom: 'bloq',
            rotulo: 'Coordenação geral',
            texto: 'Devolução aberta: leia o motivo no alto e marque como resolvida.',
            parte: null,
          },
        ];
  const bloqueios: Conferencia[] = NUMEROS.flatMap((n) => {
    const texto = pendenciaDaParte(evolucao, n, contexto);
    return texto === null ? [] : [{ tom: 'bloq', rotulo: rotuloDaParte(n), texto, parte: n }];
  });
  const alertas: Conferencia[] = NUMEROS.flatMap((n) => {
    const texto = avisoDaParte(evolucao, n, contexto);
    return texto == null ? [] : [{ tom: 'alerta', rotulo: rotuloDaParte(n), texto, parte: n }];
  });
  const doTita: Conferencia[] =
    importacao?.ciencia === null
      ? alertasDoTita(importacao, evolucao).map((texto) => ({
          tom: 'alerta',
          rotulo: DO_TITA,
          texto,
          parte: null,
        }))
      : [];
  return [...devolucao, ...bloqueios, ...alertas, ...doTita];
}
