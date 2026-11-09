import { queryOptions } from '@tanstack/react-query';

import { buscarUsuarioAtual } from '@/features/auth/api/auth.api';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

/** `staleTime` de 5 min e sem retry: sem sessão, a resposta é `null`, não erro. */
export const usuarioAtualOptions = queryOptions({
  queryKey: authKeys.me(),
  queryFn: buscarUsuarioAtual,
  staleTime: 5 * 60_000,
  retry: false,
});
