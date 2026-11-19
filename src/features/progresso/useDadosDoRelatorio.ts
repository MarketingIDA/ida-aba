import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import { codigoDoRelatorio } from '@/features/progresso/pdf/gerarRelatorio';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import { useUsuario } from '@/hooks/useUsuario';
import type { MedianaDaCarteira } from '@dominio/mediana.ts';
import type { Progresso } from '@dominio/progresso.ts';

export interface PropsDoRelatorio {
  nome: string;
  assistidoId: number;
  progresso: Progresso;
  mediana: MedianaDaCarteira | null;
  /** Do mais recente ao mais antigo, como vêm do banco. */
  periodos: readonly PeriodoDaEvolucao[];
}

/**
 * O que o relatório leva, num lugar só para o "Baixar PDF" e o compartilhar: os números da tela,
 * sem filtro, quem emite e, a cada chamada, a hora da emissão.
 */
export function useDadosDoRelatorio({
  nome,
  assistidoId,
  progresso,
  mediana,
  periodos,
}: PropsDoRelatorio) {
  const usuario = useUsuario();
  const codigo = codigoDoRelatorio(periodos[0]?.codigo ?? String(assistidoId));
  const dados = (): DadosDoRelatorio => ({
    nome,
    codigo,
    emitidoPor: usuario?.nome ?? 'usuário do sistema',
    emitidoEm: new Date(),
    progresso,
    mediana,
    periodos: [...periodos].reverse(),
  });
  return { codigo, dados };
}
