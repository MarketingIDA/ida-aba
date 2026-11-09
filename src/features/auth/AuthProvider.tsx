import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';

import {
  aoEncerrarSessao,
  buscarUsuarioAtual,
  entrar,
  MENSAGENS,
  sair,
} from '@/features/auth/api/auth.api';
import { authKeys, usuarioAtualOptions } from '@/features/auth/queries';
import { AcoesDeAuthContext, UsuarioContext } from '@/hooks/useUsuario';
import { ErroApp } from '@/lib/erroApp';

/**
 * Alimentado só por `useQuery(usuarioAtualOptions)`: renderiza os filhos depois que a query
 * resolve. Guards de rota são UX; quem autoriza é o RLS. Precisa estar dentro do Router, porque
 * o `logout` navega para `/login`.
 */
export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isPending } = useQuery(usuarioAtualOptions);
  // Query com erro (banco fora do ar) vale como "ninguém entrou": a tela de login explica ao tentar.
  const usuario = data ?? null;

  useEffect(
    () => aoEncerrarSessao(() => queryClient.setQueryData(authKeys.me(), null)),
    [queryClient],
  );

  const acoes = useMemo(
    () => ({
      login: async (credenciais: { email: string; senha: string }) => {
        await entrar(credenciais);
        const atual = await buscarUsuarioAtual();
        if (atual === null) {
          await sair();
          throw new ErroApp('sem_acesso', MENSAGENS.sem_acesso);
        }
        queryClient.setQueryData(authKeys.me(), atual);
      },
      logout: async () => {
        await sair();
        await queryClient.cancelQueries();
        queryClient.clear();
        queryClient.setQueryData(authKeys.me(), null);
        await navigate('/login', { replace: true });
      },
    }),
    [queryClient, navigate],
  );

  if (isPending) {
    return (
      <p role="status" className="p-6 text-center text-apagado">
        Carregando…
      </p>
    );
  }

  return (
    <AcoesDeAuthContext value={acoes}>
      <UsuarioContext value={usuario}>{children}</UsuarioContext>
    </AcoesDeAuthContext>
  );
}
