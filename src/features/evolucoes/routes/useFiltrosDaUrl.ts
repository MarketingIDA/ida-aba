import { useRef } from 'react';
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
  const pendente = useRef<{ de: URLSearchParams; para: URLSearchParams } | null>(null);
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
      // O `setParams` não enfileira como o `useState`: duas mudanças antes da URL atualizar
      // partiriam da mesma URL velha, e a segunda desfaria a primeira. Enquanto a URL vista ainda
      // é a de antes, a próxima mudança parte da que ficou pendente.
      const base = pendente.current?.de === params ? pendente.current.para : params;
      const novos = new URLSearchParams(base);
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === '') novos.delete(chave);
        else novos.set(chave, valor);
      }
      pendente.current = { de: params, para: novos };
      setParams(novos, { replace: substituir });
    },
  };
}
