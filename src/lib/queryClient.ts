import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { logger } from '@/lib/logger';

/**
 * QueryClient global.
 * Erro 4xx não repete; o resto tenta até 3 vezes. Os `onError` dos caches são o único ponto
 * de registro de erro de query e mutation.
 */
function ehErroDoCliente(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null || !('status' in erro)) return false;
  const { status } = erro;
  return typeof status === 'number' && status >= 400 && status < 500;
}

function criarQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (erro) => {
        logger.error('query falhou', erro);
      },
    }),
    mutationCache: new MutationCache({
      onError: (erro) => {
        logger.error('mutation falhou', erro);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (tentativas, erro) => !ehErroDoCliente(erro) && tentativas < 3,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        throwOnError: false,
      },
      mutations: { retry: 0 },
    },
  });
}

export const queryClient = criarQueryClient();
