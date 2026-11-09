import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

import {
  type AcoesDeAuth,
  AcoesDeAuthContext,
  type Usuario,
  UsuarioContext,
} from '@/hooks/useUsuario';

/** QueryClient novo por teste: sem retry e sem coleta de lixo durante o teste. */
export function criarQueryClientDeTeste(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

interface Opcoes extends Omit<RenderOptions, 'wrapper'> {
  /** Usuário injetado no contexto de auth (`null` = ninguém entrou). */
  usuario?: Usuario | null;
  /** Rota inicial do MemoryRouter. */
  rota?: string;
}

/**
 * Renderiza com QueryClient, MemoryRouter e o contexto de auth com usuário injetável
 * O AuthProvider real fica para os testes da
 * própria feature `auth`, que exercitam a rede pelo MSW.
 */
export function renderWithProviders(
  ui: ReactElement,
  { usuario = null, rota = '/', ...resto }: Opcoes = {},
) {
  const queryClient = criarQueryClientDeTeste();
  const acoes: AcoesDeAuth = { login: vi.fn(), logout: vi.fn() };

  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[rota]}>
          <AcoesDeAuthContext value={acoes}>
            <UsuarioContext value={usuario}>{children}</UsuarioContext>
          </AcoesDeAuthContext>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    queryClient,
    acoes,
    ...render(ui, { wrapper: Wrapper, ...resto }),
  };
}
