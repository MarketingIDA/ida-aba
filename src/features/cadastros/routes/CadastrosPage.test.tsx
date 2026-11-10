import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { CadastrosPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { planosDemo, unidadesDoCadastroDemo } from '@/testing/factories/cadastros';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';
import { itensDa, tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const abrir = (rota = '/cadastros/unidades') =>
  renderWithProviders(
    <Routes>
      <Route path="/cadastros/:aba" element={<CadastrosPage />} />
    </Routes>,
    { rota, usuario: usuarioDemo({ papel: 'coordenacao_geral' }) },
  );

describe('Cadastros: unidades', () => {
  it('lista as unidades, as ativas primeiro, sem violação de acessibilidade', async () => {
    const { container } = abrir();

    await screen.findByRole('list', { name: 'Unidades cadastradas' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Unidades');
    expect(screen.getByRole('link', { name: 'Unidades' })).toHaveAttribute('aria-current', 'page');
    expect(itensDa('Unidades cadastradas')).toEqual([
      'UNAUnidade FictíciaEditar',
      'UNCTerceira Unidade FictíciaEditar',
      'UNBOutra Unidade FictíciaDesativadaEditar',
    ]);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it('cadastra uma unidade nova e confere a sigla e o nome antes de mandar', async () => {
    const escritas = tabelaEmMemoria('unidades', unidadesDoCadastroDemo(), 'sigla');
    const { user } = abrir();
    await screen.findByRole('list', { name: 'Unidades cadastradas' });

    await user.click(screen.getByRole('button', { name: 'Nova unidade' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova unidade' });
    expect(within(gaveta).queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar unidade' }));
    expect(
      await within(gaveta).findByText('Use de 2 a 5 letras, sem acento e sem número (ex.: BOV).'),
    ).toBeInTheDocument();
    expect(within(gaveta).getByLabelText('Nome')).toHaveAccessibleDescription(
      'Escreva o nome da unidade, com 2 letras ou mais.',
    );
    expect(escritas).toEqual([]);

    await user.type(within(gaveta).getByLabelText('Sigla'), ' und ');
    await user.type(within(gaveta).getByLabelText('Nome'), 'Quarta Unidade Fictícia');
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar unidade' }));

    expect(await screen.findByText('Unidade UND cadastrada.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: { sigla: 'UND', nome: 'Quarta Unidade Fictícia', ativa: true },
        perfil: 'cadastro',
      },
    ]);
    expect(await screen.findByText('Quarta Unidade Fictícia')).toBeInTheDocument();
  });

  it('altera e desativa uma unidade', async () => {
    const escritas = tabelaEmMemoria('unidades', unidadesDoCadastroDemo(), 'sigla');
    const { user } = abrir();

    await user.click(await screen.findByRole('button', { name: 'Editar Unidade Fictícia' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Editar UNA' });
    expect(within(gaveta).getByLabelText('Sigla')).toHaveValue('UNA');
    const ativa = within(gaveta).getByRole('checkbox', { name: /Unidade ativa/ });
    expect(ativa).toBeChecked();
    await user.click(ativa);
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Unidade UNA salva.')).toBeInTheDocument();
    expect(escritas).toEqual([
      {
        metodo: 'PATCH',
        corpo: { sigla: 'UNA', nome: 'Unidade Fictícia', ativa: false },
        perfil: 'cadastro',
      },
    ]);
    // Desativada, ela desce para o grupo das desativadas, na ordem da sigla.
    await waitFor(() => {
      expect(itensDa('Unidades cadastradas')).toEqual([
        'UNCTerceira Unidade FictíciaEditar',
        'UNAUnidade FictíciaDesativadaEditar',
        'UNBOutra Unidade FictíciaDesativadaEditar',
      ]);
    });
  });

  it('sigla repetida mostra o motivo na gaveta, que continua aberta', async () => {
    tabelaEmMemoria('unidades', unidadesDoCadastroDemo(), 'sigla');
    const { user } = abrir();
    await screen.findByRole('list', { name: 'Unidades cadastradas' });

    await user.click(screen.getByRole('button', { name: 'Nova unidade' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova unidade' });
    await user.type(within(gaveta).getByLabelText('Sigla'), 'una');
    await user.type(within(gaveta).getByLabelText('Nome'), 'Repetida Fictícia');
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar unidade' }));

    expect(await within(gaveta).findByRole('alert')).toHaveTextContent(
      'Já existe uma unidade com esta sigla.',
    );
    expect(screen.getByRole('dialog', { name: 'Nova unidade' })).toBeInTheDocument();
  });

  it('"Cancelar" fecha a gaveta sem salvar', async () => {
    const escritas = tabelaEmMemoria('unidades', unidadesDoCadastroDemo(), 'sigla');
    const { user } = abrir();
    await screen.findByRole('list', { name: 'Unidades cadastradas' });

    await user.click(screen.getByRole('button', { name: 'Nova unidade' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova unidade' });
    await user.type(within(gaveta).getByLabelText('Sigla'), 'XYZ');
    await user.click(within(gaveta).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(escritas).toEqual([]);
  });

  it('sem unidades, o vazio oferece cadastrar a primeira', async () => {
    tabelaEmMemoria('unidades', [], 'sigla');
    const { user } = abrir();

    expect(await screen.findByText('Nenhuma unidade cadastrada')).toBeInTheDocument();
    const [, doVazio] = screen.getAllByRole('button', { name: 'Nova unidade' });
    if (doVazio === undefined) throw new Error('O vazio não oferece o cadastro.');
    await user.click(doVazio);
    expect(await screen.findByRole('dialog', { name: 'Nova unidade' })).toBeInTheDocument();
  });

  it('falha ao carregar explica e tenta de novo', async () => {
    // 500, não erro de rede: o supabase-js repete sozinho a falha de rede, com espera.
    server.use(
      http.get(
        `${env.SUPABASE_URL}/rest/v1/unidades`,
        () => HttpResponse.json({ message: 'falha' }, { status: 500 }),
        { once: true },
      ),
    );
    const { user } = abrir();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar unidades',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('list', { name: 'Unidades cadastradas' })).toBeInTheDocument();
  });

  it('endereço sem parte conhecida vai para as unidades', async () => {
    abrir('/cadastros/qualquer');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Unidades');
  });
});

describe('Cadastros: planos', () => {
  it('lista os planos, marca o desativado e recusa nome repetido', async () => {
    const escritas = tabelaEmMemoria('planos', planosDemo(), 'nome');
    const { user } = abrir('/cadastros/planos');

    await screen.findByRole('list', { name: 'Planos cadastrados' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Planos de saúde');
    expect(itensDa('Planos cadastrados')).toEqual([
      'Plano FictícioEditar',
      'Plano Fictício AntigoDesativadoEditar',
    ]);

    await user.click(screen.getByRole('button', { name: 'Novo plano' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Novo plano' });
    await user.type(within(gaveta).getByLabelText('Nome do plano'), 'Plano Fictício');
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar plano' }));
    expect(await within(gaveta).findByRole('alert')).toHaveTextContent(
      'Já existe um plano com este nome.',
    );

    await user.clear(within(gaveta).getByLabelText('Nome do plano'));
    await user.type(within(gaveta).getByLabelText('Nome do plano'), 'Plano Novo Fictício');
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar plano' }));
    expect(await screen.findByText('Plano Plano Novo Fictício cadastrado.')).toBeInTheDocument();
    expect(escritas.at(-1)?.corpo).toEqual({ nome: 'Plano Novo Fictício', ativo: true });
  });

  it('altera um plano pela gaveta, com o nome dele no título', async () => {
    const escritas = tabelaEmMemoria('planos', planosDemo(), 'nome');
    const { user } = abrir('/cadastros/planos');

    await user.click(await screen.findByRole('button', { name: 'Editar Plano Fictício Antigo' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Editar Plano Fictício Antigo' });
    await user.click(within(gaveta).getByRole('checkbox', { name: /Plano ativo/ }));
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Plano Plano Fictício Antigo salvo.')).toBeInTheDocument();
    expect(escritas).toEqual([
      {
        metodo: 'PATCH',
        corpo: { nome: 'Plano Fictício Antigo', ativo: true },
        perfil: 'cadastro',
      },
    ]);
  });
});
