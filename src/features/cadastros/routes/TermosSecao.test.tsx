import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { CadastrosPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { itensDa, tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const TERMOS = [
  { id: 1, termo: 'birra', substituto: 'episódio de desregulação emocional', ativo: true },
  { id: 2, termo: 'teimosia', substituto: 'rigidez comportamental', ativo: false },
];

describe('Cadastros: termos inadequados', () => {
  it('lista os termos com o substituto e inclui um termo novo', async () => {
    const escritas = tabelaEmMemoria('termos_inadequados', TERMOS, 'termo');
    const { user, container } = renderWithProviders(
      <Routes>
        <Route path="/cadastros/:aba" element={<CadastrosPage />} />
      </Routes>,
      { rota: '/cadastros/termos', usuario: usuarioDemo({ papel: 'coordenacao_geral' }) },
    );

    await screen.findByRole('list', { name: 'Termos da lista' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Termos inadequados');
    expect(itensDa('Termos da lista')).toEqual([
      'birraTroca por: episódio de desregulação emocionalEditar',
      'teimosiaDesativadoTroca por: rigidez comportamentalEditar',
    ]);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Novo termo' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Novo termo' });
    await user.type(within(gaveta).getByLabelText('Termo'), '  mal   educado ');
    await user.type(within(gaveta).getByLabelText('Substituto técnico'), 'socialmente inadequado');
    await user.click(within(gaveta).getByRole('button', { name: 'Incluir termo' }));

    expect(await screen.findByText('Termo "mal educado" incluído.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: { termo: 'mal educado', substituto: 'socialmente inadequado', ativo: true },
        perfil: 'cadastro',
      },
    ]);
  });
});
