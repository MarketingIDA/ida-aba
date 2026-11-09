import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ExigeUsuario } from '@/features/auth/components/ExigeUsuario';
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { useAcoesDeAuth, useUsuario } from '@/hooks/useUsuario';
import { SENHA_DEMO, usuarioDemo } from '@/testing/factories/usuario';
import { CHAVE_DA_SESSAO, sessaoDemo } from '@/testing/handlers/auth';
import { criarQueryClientDeTeste } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

/** Tela protegida mínima: mostra quem entrou e deixa sair (as telas reais são de outras features). */
function TelaInicial() {
  const usuario = useUsuario();
  const { logout } = useAcoesDeAuth();
  return (
    <main>
      <p>{usuario?.nome}</p>
      <button type="button" onClick={() => void logout()}>
        Sair
      </button>
    </main>
  );
}

/** A composição do app (providers + rotas) com Router de memória: a rede é o MSW. */
function renderizarApp(rota = '/') {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={criarQueryClientDeTeste()}>
      <MemoryRouter initialEntries={[rota]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ExigeUsuario />}>
              <Route index element={<TelaInicial />} />
              <Route path="/secreta" element={<p>conteúdo protegido</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user };
}

async function entrarComo(user: ReturnType<typeof userEvent.setup>, email: string, senha: string) {
  await user.type(await screen.findByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), senha);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('AuthProvider', () => {
  it('sem sessão, mostra "Carregando…" e depois manda para o login', async () => {
    renderizarApp('/');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
  });

  it('senha errada: mensagem genérica e continua no login', async () => {
    const { user } = renderizarApp('/login');
    await entrarComo(user, usuarioDemo().email, 'outra-senha');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('entra, mostra a tela inicial com o nome e sai de volta para o login', async () => {
    const { user } = renderizarApp('/login');
    await entrarComo(user, usuarioDemo().email, SENHA_DEMO);

    expect(await screen.findByText('Carla Fictícia Coordenadora')).toBeInTheDocument();
    expect(localStorage.getItem(CHAVE_DA_SESSAO)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(localStorage.getItem(CHAVE_DA_SESSAO)).toBeNull();
  });

  it('volta para a rota protegida de onde veio', async () => {
    const { user } = renderizarApp('/secreta');
    await entrarComo(user, usuarioDemo().email, SENHA_DEMO);
    expect(await screen.findByText('conteúdo protegido')).toBeInTheDocument();
  });

  it('conta do Auth sem linha ativa em acesso.usuarios não entra', async () => {
    server.use(http.get(`${env.SUPABASE_URL}/rest/v1/usuarios`, () => HttpResponse.json([])));
    const { user } = renderizarApp('/login');
    await entrarComo(user, usuarioDemo().email, SENHA_DEMO);

    expect(await screen.findByRole('alert')).toHaveTextContent('não tem acesso ao sistema');
    expect(localStorage.getItem(CHAVE_DA_SESSAO)).toBeNull();
  });

  it('usuário inativo também não entra', async () => {
    server.use(
      http.get(`${env.SUPABASE_URL}/rest/v1/usuarios`, () =>
        HttpResponse.json([usuarioDemo({ ativo: false })]),
      ),
    );
    const { user } = renderizarApp('/login');
    await entrarComo(user, usuarioDemo().email, SENHA_DEMO);
    expect(await screen.findByRole('alert')).toHaveTextContent('não tem acesso ao sistema');
  });

  it('banco fora do ar: explica que não deu para entrar agora', async () => {
    server.use(
      http.get(`${env.SUPABASE_URL}/rest/v1/usuarios`, () =>
        HttpResponse.json({ message: 'erro' }, { status: 500 }),
      ),
    );
    const { user } = renderizarApp('/login');
    await entrarComo(user, usuarioDemo().email, SENHA_DEMO);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar agora');
  });

  it('Auth fora do ar no login: mesma mensagem de indisponível', async () => {
    server.use(
      http.post(`${env.SUPABASE_URL}/auth/v1/token`, () =>
        HttpResponse.json({ code: 500, msg: 'erro' }, { status: 500 }),
      ),
    );
    const { user } = renderizarApp('/login');
    await entrarComo(user, usuarioDemo().email, SENHA_DEMO);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar agora');
  });

  it('com sessão salva no navegador, abre a tela inicial direto', async () => {
    localStorage.setItem(CHAVE_DA_SESSAO, JSON.stringify(sessaoDemo()));
    renderizarApp('/');
    expect(await screen.findByText('Carla Fictícia Coordenadora')).toBeInTheDocument();
  });
});
