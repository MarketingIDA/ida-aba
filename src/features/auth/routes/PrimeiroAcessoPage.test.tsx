import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { PrimeiroAcessoPage } from '@/features/auth/routes/PrimeiroAcessoPage';
import type { Usuario } from '@/hooks/useUsuario';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { usuarioDemo } from '@/testing/factories/usuario';
import { CHAVE_DA_SESSAO, sessaoDemo } from '@/testing/handlers/auth';
import { renderWithProviders } from '@/testing/renderWithProviders';

const SENHA = 'uma frase longa e fictícia';

function renderizar(usuario: Usuario | null = usuarioDemo()) {
  return renderWithProviders(
    <Routes>
      <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
      <Route path="/" element={<p>Sistema aberto</p>} />
    </Routes>,
    { usuario, rota: '/primeiro-acesso' },
  );
}

describe('PrimeiroAcessoPage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('cria a senha de 15 caracteres ou mais e abre o sistema', { timeout: 15_000 }, async () => {
    localStorage.setItem(CHAVE_DA_SESSAO, JSON.stringify(sessaoDemo()));
    const { user } = renderizar();
    expect(screen.getByText(/Olá, Carla\./)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Senha nova'), 'curta');
    await user.type(screen.getByLabelText('Repita a senha'), 'curta');
    await user.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('15 caracteres ou mais');

    await user.clear(screen.getByLabelText('Senha nova'));
    await user.clear(screen.getByLabelText('Repita a senha'));
    await user.type(screen.getByLabelText('Senha nova'), SENHA);
    await user.type(screen.getByLabelText('Repita a senha'), `${SENHA}!`);
    await user.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('As duas senhas não são iguais.');

    await user.type(screen.getByLabelText('Senha nova'), '!');
    await user.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));
    expect(await screen.findByText('Sistema aberto')).toBeInTheDocument();
  });

  it('sem a sessão do link, explica que ele venceu', async () => {
    const { container } = renderizar(null);
    expect(screen.getByRole('heading', { name: 'Link vencido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute(
      'href',
      '/recuperar-senha',
    );
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});
