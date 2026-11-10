import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { CadastrosPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { assistidosDemo } from '@/testing/factories/cadastros';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { itensDa, tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const abrir = () =>
  renderWithProviders(
    <Routes>
      <Route path="/cadastros/:aba" element={<CadastrosPage />} />
    </Routes>,
    { rota: '/cadastros/assistidos', usuario: usuarioDemo({ papel: 'coordenacao_geral' }) },
  );

const LISTA = 'Assistidos cadastrados';

describe('Cadastros: assistidos', () => {
  it('lista os assistidos com a carteira e o plano, e filtra pelo nome sem ligar para acento', async () => {
    const { user, container } = abrir();

    await screen.findByRole('list', { name: LISTA });
    expect(screen.getByRole('link', { name: 'Assistidos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(itensDa(LISTA)).toEqual([
      'UNAAna Fictícia SouzaManhã · Carla Fictícia Coordenadora · Plano FictícioEditar',
      'UNACaio Fictício LimaSem planoTarde · Bruno Fictício NovoEditar',
      'UNADavi Fictício RochaDesativadoManhã · Bruno Fictício Novo · Plano Fictício AntigoEditar',
    ]);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.type(screen.getByLabelText('Buscar pelo nome'), 'fictícia');
    expect(itensDa(LISTA)).toEqual([
      'UNAAna Fictícia SouzaManhã · Carla Fictícia Coordenadora · Plano FictícioEditar',
    ]);
    expect(screen.getByText('1 de 3 assistidos.')).toBeInTheDocument();
  });

  it('cadastra um assistido na carteira escolhida, com a unidade que vem dela', async () => {
    const escritas = tabelaEmMemoria('assistidos', assistidosDemo(), () => false);
    const { user } = abrir();
    await screen.findByRole('list', { name: LISTA });

    await user.click(screen.getByRole('button', { name: 'Novo assistido' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Novo assistido' });
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar assistido' }));
    expect(
      await within(gaveta).findByText('Escreva o nome completo, com sobrenome.'),
    ).toBeInTheDocument();
    expect(escritas).toEqual([]);

    // Só as carteiras ativas.
    const carteira = within(gaveta).getByLabelText('Carteira');
    expect(
      within(carteira)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'Escolha a carteira',
      'UNA · Manhã · Carla Fictícia Coordenadora',
      'UNA · Tarde · Bruno Fictício Novo',
      'UNB · Integral · Carla Fictícia Coordenadora',
    ]);
    await user.type(within(gaveta).getByLabelText('Nome completo'), 'Elisa Fictícia Prado');
    await user.click(within(gaveta).getByRole('radio', { name: 'Feminino' }));
    await user.selectOptions(within(gaveta).getByLabelText('Plano de saúde'), 'Plano Fictício');
    await user.selectOptions(carteira, 'UNB · Integral · Carla Fictícia Coordenadora');
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar assistido' }));

    expect(await screen.findByText('Cadastro de Elisa Fictícia Prado criado.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: {
          nome: 'Elisa Fictícia Prado',
          genero: 'feminino',
          data_nascimento: null,
          plano_id: 1,
          unidade_id: 2,
          carteira_id: 2,
          ativo: true,
        },
        perfil: 'cadastro',
      },
    ]);
  });
});
