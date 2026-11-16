import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { CadastrosPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { assistidosDemo } from '@/testing/factories/cadastros';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';
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

    await user.type(screen.getByLabelText('Buscar pelo nome'), 'FICTICIA');
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
      'UNB · Integral · Carla Fictícia Coordenadora (unidade desativada)',
    ]);
    await user.type(within(gaveta).getByLabelText('Nome completo'), 'Elisa Fictícia Prado');
    await user.click(within(gaveta).getByRole('radio', { name: 'Feminino' }));
    await user.selectOptions(within(gaveta).getByLabelText('Plano de saúde'), 'Plano Fictício');
    await user.selectOptions(
      carteira,
      'UNB · Integral · Carla Fictícia Coordenadora (unidade desativada)',
    );
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

  it('põe vários rascunhos numa carteira de uma vez; o sem gênero fica de fora', async () => {
    const rascunho = { data_nascimento: null, plano_id: null, carteira_id: null, ativo: true };
    const rascunhos = [
      { ...rascunho, id: 4, nome: 'Bia Fictícia Rascunho', genero: 'feminino', unidade_id: 1 },
      { ...rascunho, id: 5, nome: 'Edu Fictício Rascunho', genero: 'masculino', unidade_id: 3 },
      { ...rascunho, id: 6, nome: 'Alex Fictício Exemplo', genero: null, unidade_id: 1 },
    ];
    const pedidos: unknown[] = [];
    server.use(
      http.get(`${env.SUPABASE_URL}/rest/v1/assistidos`, () =>
        HttpResponse.json([...assistidosDemo(), ...rascunhos]),
      ),
      http.post(
        `${env.SUPABASE_URL}/rest/v1/rpc/por_rascunhos_na_carteira`,
        async ({ request }) => {
          pedidos.push({
            corpo: await request.json(),
            perfil: request.headers.get('content-profile'),
          });
          return HttpResponse.json({ postos: 2, sem_genero: 0, com_carteira: 0 });
        },
      ),
    );
    const { user, container } = abrir();
    await screen.findByRole('list', { name: LISTA });
    await user.selectOptions(screen.getByLabelText('Carteira'), 'Rascunhos, sem carteira');

    const lote = screen.getByRole('region', { name: 'Pôr na carteira' });
    expect(lote).toHaveTextContent('1 rascunho sem gênero fica de fora');
    expect(screen.getByRole('checkbox', { name: 'Marcar Alex Fictício Exemplo' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Marcar Bia Fictícia Rascunho' }));
    expect(lote).toHaveTextContent('1 marcado.');
    await user.click(within(lote).getByRole('button', { name: 'Marcar todos da lista' }));
    expect(lote).toHaveTextContent('2 marcados.');
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.selectOptions(
      within(lote).getByLabelText('Carteira dos marcados'),
      'UNA · Manhã · Carla Fictícia Coordenadora',
    );
    await user.click(within(lote).getByRole('button', { name: 'Pôr na carteira' }));
    const confirmacao = within(lote).getByRole('group', { name: 'Confirmar a carteira' });
    expect(confirmacao).toHaveTextContent(
      '2 rascunhos vão para UNA · Manhã · Carla Fictícia Coordenadora. 1 vem de outra unidade e passa para a UNA.',
    );
    expect(pedidos).toEqual([]);
    await user.click(within(confirmacao).getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByText('2 rascunhos postos em UNA · Manhã · Carla Fictícia Coordenadora.'),
    ).toBeInTheDocument();
    expect(pedidos).toEqual([
      { corpo: { p_assistidos: [4, 5], p_carteira_id: 4 }, perfil: 'cadastro' },
    ]);
  });
});
