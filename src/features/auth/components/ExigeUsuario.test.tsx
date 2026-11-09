import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ExigeUsuario } from '@/features/auth/components/ExigeUsuario';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';

const rotas = (
  <Routes>
    <Route path="/login" element={<p>tela de login</p>} />
    <Route element={<ExigeUsuario />}>
      <Route path="/secreta" element={<p>conteúdo protegido</p>} />
    </Route>
  </Routes>
);

describe('ExigeUsuario', () => {
  it('mostra a rota quando há usuário', () => {
    renderWithProviders(rotas, { usuario: usuarioDemo(), rota: '/secreta' });
    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
  });

  it('manda para o login quando ninguém entrou', () => {
    renderWithProviders(rotas, { rota: '/secreta' });
    expect(screen.getByText('tela de login')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument();
  });
});
