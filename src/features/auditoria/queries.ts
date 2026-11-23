import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import {
  buscarEventos,
  buscarPessoas,
  type FiltroDaAuditoria,
  POR_PAGINA,
} from '@/features/auditoria/api/auditoria.api';

export const auditoriaKeys = {
  all: ['auditoria'] as const,
  eventos: (filtro: FiltroDaAuditoria) => [...auditoriaKeys.all, 'eventos', filtro] as const,
  pessoas: () => [...auditoriaKeys.all, 'pessoas'] as const,
};

/** Da mais nova para a mais antiga; a próxima página começa antes do último id carregado. */
export const eventosOptions = (filtro: FiltroDaAuditoria) =>
  infiniteQueryOptions({
    queryKey: auditoriaKeys.eventos(filtro),
    queryFn: ({ pageParam }) => buscarEventos(filtro, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (pagina) =>
      pagina.length < POR_PAGINA ? undefined : (pagina.at(-1)?.id ?? undefined),
  });

export const pessoasOptions = () =>
  queryOptions({ queryKey: auditoriaKeys.pessoas(), queryFn: buscarPessoas });
