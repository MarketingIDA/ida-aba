import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import type { MedianaDaCarteira } from '@dominio/mediana.ts';
import type { Progresso } from '@dominio/progresso.ts';

/** O que o relatório de metas (E28) leva: os mesmos números da tela, sempre sem filtro. */
export interface DadosDoRelatorio {
  nome: string;
  /** O código do relatório, `UNI-AAMM-NNN-METAS`: é ele, não o nome, que vai no nome do arquivo. */
  codigo: string;
  emitidoPor: string;
  emitidoEm: Date;
  progresso: Progresso;
  mediana: MedianaDaCarteira | null;
  /** Do mais antigo ao mais recente. */
  periodos: readonly PeriodoDaEvolucao[];
}
