import { useQuery } from '@tanstack/react-query';

import { arquivosDoMesOptions } from '@/features/arquivo-do-mes/queries';
import { contarPorSituacao, type Situacao } from '@/features/evolucoes/logica';
import { evolucoesDoMesOptions } from '@/features/evolucoes/queries';
import type { Papel } from '@/hooks/useUsuario';

/** O andamento do mês no card do menu: quantos já foram, de quantos, e o que se conta. */
export interface Andamento {
  feitos: number;
  total: number;
  rotulo: string;
}

export interface ResumoDoMenu {
  /** Assistidos por situação (coordenador e coordenação geral); `null` enquanto carrega. */
  porSituacao: Record<Situacao, number> | null;
  /** Carteiras com o arquivo do mês já enviado (coordenação geral e contas médicas). */
  arquivosEnviados: number | null;
  andamento: Andamento | null;
}

function andamentoDoPapel(
  papel: Papel,
  porSituacao: Record<Situacao, number> | null,
  carteiras: { enviadas: number; total: number } | null,
): Andamento | null {
  if (papel === 'contas_medicas') {
    return (
      carteiras && {
        feitos: carteiras.enviadas,
        total: carteiras.total,
        rotulo: 'arquivos recebidos',
      }
    );
  }
  if (porSituacao === null) return null;
  const total = Object.values(porSituacao).reduce((soma, n) => soma + n, 0);
  if (papel === 'coordenacao_geral' || porSituacao.enviada > 0) {
    const rotulo = papel === 'coordenador' ? 'no arquivo enviado' : 'enviadas';
    return { feitos: porSituacao.enviada, total, rotulo };
  }
  return { feitos: porSituacao.concluida + porSituacao.enviada, total, rotulo: 'concluídas' };
}

/**
 * Os números do menu (contadores e o andamento do card do mês). Reusa as consultas das telas, com
 * a mesma chave: o menu não faz pedido a mais quando a tela já pediu.
 */
export function useResumoDoMenu(papel: Papel, mes: string): ResumoDoMenu {
  const evolucoes = useQuery({
    ...evolucoesDoMesOptions(mes),
    enabled: papel !== 'contas_medicas',
  });
  const arquivos = useQuery({ ...arquivosDoMesOptions(mes), enabled: papel !== 'coordenador' });
  const porSituacao = evolucoes.data ? contarPorSituacao(evolucoes.data) : null;
  const carteiras = arquivos.data
    ? {
        enviadas: arquivos.data.filter((carteira) => carteira.arquivo !== null).length,
        total: arquivos.data.length,
      }
    : null;
  return {
    porSituacao,
    arquivosEnviados: carteiras?.enviadas ?? null,
    andamento: andamentoDoPapel(papel, porSituacao, carteiras),
  };
}
