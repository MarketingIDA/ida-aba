import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { CadastrosPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { carteirasDemo, mesmaVagaAtiva, pessoasDemo } from '@/testing/factories/cadastros';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';
import { itensDa, tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const abrir = () =>
  renderWithProviders(
    <Routes>
      <Route path="/cadastros/:aba" element={<CadastrosPage />} />
    </Routes>,
    { rota: '/cadastros/carteiras', usuario: usuarioDemo({ papel: 'coordenacao_geral' }) },
  );

const tabelaDeCarteiras = () =>
  tabelaEmMemoria('carteiras', carteirasDemo(), mesmaVagaAtiva, { ativa: true });

const LISTA = 'Carteiras cadastradas';
const rest = (tabela: string) => `${env.SUPABASE_URL}/rest/v1/${tabela}`;

describe('Cadastros: carteiras', () => {
  it('lista as carteiras, as ativas primeiro, com unidade, turno, coordenação e avisos', async () => {
    const { container } = abrir();

    await screen.findByRole('list', { name: LISTA });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Carteiras');
    expect(screen.getByRole('link', { name: 'Carteiras' })).toHaveAttribute('aria-current', 'page');
    expect(itensDa(LISTA)).toEqual([
      'UNAUnidade Fictícia · ManhãCarla Fictícia CoordenadoraEditar',
      'UNAUnidade Fictícia · TardeBruno Fictício NovoEditar',
      'UNBOutra Unidade Fictícia · IntegralUnidade desativadaCarla Fictícia CoordenadoraEditar',
      'UNAUnidade Fictícia · ManhãDesativadaBruno Fictício NovoEditar',
    ]);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it('cadastra uma carteira: pede as escolhas e não oferece turno que já tem carteira', async () => {
    const escritas = tabelaDeCarteiras();
    const { user, container } = abrir();
    await screen.findByRole('list', { name: LISTA });

    await user.click(screen.getByRole('button', { name: 'Nova carteira' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova carteira' });
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar carteira' }));
    expect(await within(gaveta).findByText('Escolha o turno da carteira.')).toBeInTheDocument();
    expect(within(gaveta).getByLabelText('Unidade')).toHaveAccessibleDescription(
      'Escolha a unidade da carteira.',
    );
    expect(escritas).toEqual([]);

    // Só as unidades ativas; a UNA já tem manhã e tarde.
    const unidade = within(gaveta).getByLabelText('Unidade');
    expect(
      within(unidade)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Escolha a unidade', 'UNA · Unidade Fictícia', 'UNC · Terceira Unidade Fictícia']);
    await user.selectOptions(unidade, 'UNA · Unidade Fictícia');
    const manha = within(gaveta).getByRole('radio', { name: 'Manhã' });
    expect(manha).toBeDisabled();
    expect(manha).toHaveAccessibleDescription(
      'Já tem carteira ativa, com Carla Fictícia Coordenadora.',
    );
    expect(within(gaveta).getByRole('radio', { name: 'Tarde' })).toBeDisabled();
    await user.click(within(gaveta).getByRole('radio', { name: 'Integral' }));
    await user.selectOptions(within(gaveta).getByLabelText('Coordenação'), 'Bruno Fictício Novo');
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar carteira' }));

    expect(await screen.findByText('Carteira UNA · Integral cadastrada.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: { unidade_id: 1, turno: 'integral', coordenador_id: 4 },
        perfil: 'cadastro',
      },
    ]);
  });

  it('passa a carteira para outra coordenação, sem mexer na unidade e no turno', async () => {
    const escritas = tabelaDeCarteiras();
    const { user } = abrir();

    await user.click(
      await screen.findByRole('button', {
        name: 'Editar carteira UNA · Manhã (Carla Fictícia Coordenadora)',
      }),
    );
    const gaveta = await screen.findByRole('dialog', { name: 'Editar carteira UNA · Manhã' });
    expect(gaveta).toHaveTextContent('Unidade e turnoUNA · Unidade Fictícia, manhã.');
    const coordenacao = within(gaveta).getByLabelText('Coordenação');
    expect(coordenacao).toHaveValue('2');
    expect(coordenacao).toHaveAccessibleDescription(
      'Passar a carteira muda quem vê os assistidos e as evoluções dela.',
    );
    await user.selectOptions(coordenacao, 'Bruno Fictício Novo');
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Carteira UNA · Manhã salva.')).toBeInTheDocument();
    expect(escritas).toEqual([
      { metodo: 'PATCH', corpo: { coordenador_id: 4, ativa: true }, perfil: 'cadastro' },
    ]);
  });

  it('reativar a carteira antiga com a vaga ocupada é recusado, e a gaveta fica aberta', async () => {
    tabelaDeCarteiras();
    const { user } = abrir();

    await user.click(
      await screen.findByRole('button', {
        name: 'Editar carteira UNA · Manhã (Bruno Fictício Novo, desativada)',
      }),
    );
    const gaveta = await screen.findByRole('dialog', { name: 'Editar carteira UNA · Manhã' });
    await user.click(within(gaveta).getByRole('checkbox', { name: /Carteira ativa/ }));
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));

    expect(await within(gaveta).findByRole('alert')).toHaveTextContent(
      'Esta unidade já tem carteira ativa neste turno. Passe a que existe ou desative-a.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sem unidade ativa nem coordenação, a gaveta diz o que falta e leva até lá', async () => {
    tabelaEmMemoria('carteiras', [], 'id');
    server.use(
      http.get(rest('unidades'), () => HttpResponse.json([])),
      http.get(rest('usuarios'), () =>
        HttpResponse.json(pessoasDemo().filter((pessoa) => pessoa.papel !== 'coordenador')),
      ),
    );
    const { user } = abrir();

    expect(await screen.findByText('Nenhuma carteira cadastrada')).toBeInTheDocument();
    const [doCabecalho] = screen.getAllByRole('button', { name: 'Nova carteira' });
    if (doCabecalho === undefined) throw new Error('Sem o botão "Nova carteira".');
    await user.click(doCabecalho);
    const gaveta = await screen.findByRole('dialog', { name: 'Nova carteira' });
    expect(gaveta).toHaveTextContent('Falta cadastro para criar uma carteira.');
    expect(within(gaveta).queryByRole('button', { name: 'Cadastrar carteira' })).toBeNull();
    expect(within(gaveta).getByRole('link', { name: 'Ir para Unidades' })).toHaveAttribute(
      'href',
      '/cadastros/unidades',
    );
    await user.click(within(gaveta).getByRole('link', { name: 'Ir para Pessoas' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Pessoas');
  });

  it('falha numa das três listas explica e tenta de novo', async () => {
    server.use(
      http.get(rest('usuarios'), () => HttpResponse.json({ message: 'falha' }, { status: 500 }), {
        once: true,
      }),
    );
    const { user } = abrir();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar carteiras',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('list', { name: LISTA })).toBeInTheDocument();
  });
});
