import { useSearchParams } from 'react-router';

import { ehSituacao, type Situacao } from '@/features/evolucoes/logica';

export type ChaveDoFiltro = 'mes' | 'situacao' | 'q' | 'unidade' | 'coordenador';

export interface FiltrosDaUrl {
  mes: string;
  situacao: Situacao | null;
  busca: string;
  unidade: string | null;
  coordenadorId: number | null;
  /** Vazio tira o filtro da URL; `substituir` não cria entrada no histórico (busca digitada). */
  mudar: (mudancas: Partial<Record<ChaveDoFiltro, string>>, substituir?: boolean) => void;
}

/**
 * Os filtros da tela moram na URL: dá para voltar, recarregar e mandar o link. Valor inválido na
 * URL vira o padrão (mês aberto, sem filtro).
 */
export function useFiltrosDaUrl(mesAberto: string, meses: readonly string[]): FiltrosDaUrl {
  const [params, setParams] = useSearchParams();
  const mesDaUrl = params.get('mes') ?? '';
  const situacaoDaUrl = params.get('situacao');
  const coordenadorDaUrl = params.get('coordenador') ?? '';
  const unidade = params.get('unidade') ?? '';

  return {
    mes: meses.includes(mesDaUrl) ? mesDaUrl : mesAberto,
    situacao: ehSituacao(situacaoDaUrl) ? situacaoDaUrl : null,
    busca: params.get('q') ?? '',
    unidade: unidade === '' ? null : unidade,
    coordenadorId: /^\d+$/.test(coordenadorDaUrl) ? Number(coordenadorDaUrl) : null,
    mudar: (mudancas, substituir = false) => {
      setParams(
        (atuais) => {
          const novos = new URLSearchParams(atuais);
          for (const [chave, valor] of Object.entries(mudancas)) {
            if (valor === '') novos.delete(chave);
            else novos.set(chave, valor);
          }
          return novos;
        },
        { replace: substituir },
      );
    },
  };
}
