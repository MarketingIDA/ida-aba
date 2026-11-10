import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { CadastrosPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { type LinhaDePessoa, pessoasDemo } from '@/testing/factories/cadastros';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';
import { itensDa, tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const abrir = () =>
  renderWithProviders(
    <Routes>
      <Route path="/cadastros/:aba" element={<CadastrosPage />} />
    </Routes>,
    { rota: '/cadastros/pessoas', usuario: usuarioDemo({ papel: 'coordenacao_geral' }) },
  );

const tabelaDePessoas = () =>
  tabelaEmMemoria<LinhaDePessoa>('usuarios', pessoasDemo(), 'email', { auth_user_id: null });

const LISTA = 'Pessoas cadastradas';

describe('Cadastros: pessoas', () => {
  it('lista as pessoas, as ativas primeiro, com papel, e-mail e as marcas', async () => {
    const { container } = abrir();

    await screen.findByRole('list', { name: LISTA });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pessoas');
    expect(screen.getByRole('link', { name: 'Pessoas' })).toHaveAttribute('aria-current', 'page');
    expect(itensDa(LISTA)).toEqual([
      'Bruno Fictício NovoSem contaCoordenação de unidade · novo.demo@evolucao-aba.testEditar',
      'Carla Fictícia CoordenadoraCoordenação de unidade · coordenacao.demo@evolucao-aba.testEditar',
      'Gabriela Fictícia GeralVocêCoordenação geral · geral.demo@evolucao-aba.testEditar',
      'Caio Fictício ContasDesativadaContas médicas · contas.demo@evolucao-aba.testEditar',
    ]);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it('cadastra uma pessoa: confere os campos, pede o papel e manda o CRP só da coordenação de unidade', async () => {
    const escritas = tabelaDePessoas();
    const { user, container } = abrir();
    await screen.findByRole('list', { name: LISTA });

    await user.click(screen.getByRole('button', { name: 'Nova pessoa' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova pessoa' });
    expect(within(gaveta).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(gaveta).queryByLabelText('CRP (opcional)')).not.toBeInTheDocument();
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(await within(gaveta).findByText('Escolha o papel da pessoa.')).toBeInTheDocument();
    expect(within(gaveta).getByLabelText('E-mail')).toHaveAccessibleDescription(
      'A pessoa entra no sistema com este e-mail. Escreva o e-mail completo, como nome@clinica.com.br.',
    );
    expect(escritas).toEqual([]);

    await user.type(within(gaveta).getByLabelText('Nome'), 'Dora Fictícia Nova');
    await user.type(within(gaveta).getByLabelText('E-mail'), ' Dora.Demo@Evolucao-ABA.test ');
    await user.click(within(gaveta).getByRole('radio', { name: 'Coordenação de unidade' }));
    await user.type(await within(gaveta).findByLabelText('CRP (opcional)'), '06/99999');
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(await screen.findByText('Cadastro de Dora Fictícia Nova criado.')).toBeInTheDocument();
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: {
          nome: 'Dora Fictícia Nova',
          email: 'dora.demo@evolucao-aba.test',
          papel: 'coordenador',
          crp: '06/99999',
          ativo: true,
        },
        perfil: 'acesso',
      },
    ]);
    await waitFor(() => {
      expect(itensDa(LISTA)).toContainEqual(expect.stringMatching(/^Dora Fictícia NovaSem conta/));
    });
  });

  it('o CRP digitado não vai para quem não coordena unidade', async () => {
    const escritas = tabelaDePessoas();
    const { user } = abrir();
    await screen.findByRole('list', { name: LISTA });

    await user.click(screen.getByRole('button', { name: 'Nova pessoa' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova pessoa' });
    await user.type(within(gaveta).getByLabelText('Nome'), 'Elio Fictício Contas');
    await user.type(within(gaveta).getByLabelText('E-mail'), 'elio.demo@evolucao-aba.test');
    await user.click(within(gaveta).getByRole('radio', { name: 'Coordenação de unidade' }));
    await user.type(await within(gaveta).findByLabelText('CRP (opcional)'), '1');
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(await within(gaveta).findByText(/com 4 a 20 caracteres/)).toBeInTheDocument();

    await user.click(within(gaveta).getByRole('radio', { name: 'Contas médicas' }));
    expect(within(gaveta).queryByLabelText('CRP (opcional)')).not.toBeInTheDocument();
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(await screen.findByText('Cadastro de Elio Fictício Contas criado.')).toBeInTheDocument();
    expect(escritas.at(-1)?.corpo).toMatchObject({ papel: 'contas_medicas', crp: null });
  });

  it('altera e desativa quem já tem conta, com o e-mail travado', async () => {
    const escritas = tabelaDePessoas();
    const { user } = abrir();

    await user.click(
      await screen.findByRole('button', { name: 'Editar Carla Fictícia Coordenadora' }),
    );
    const gaveta = await screen.findByRole('dialog', {
      name: 'Editar Carla Fictícia Coordenadora',
    });
    expect(within(gaveta).getByLabelText('E-mail')).toHaveAttribute('readonly');
    expect(within(gaveta).getByRole('radio', { name: 'Coordenação de unidade' })).toBeChecked();
    expect(within(gaveta).getByLabelText('CRP (opcional)')).toHaveValue('06/12345');
    await user.click(within(gaveta).getByRole('checkbox', { name: /Pessoa ativa/ }));
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));

    expect(
      await screen.findByText('Alterações de Carla Fictícia Coordenadora salvas.'),
    ).toBeInTheDocument();
    expect(escritas).toEqual([
      {
        metodo: 'PATCH',
        corpo: {
          nome: 'Carla Fictícia Coordenadora',
          email: 'coordenacao.demo@evolucao-aba.test',
          papel: 'coordenador',
          crp: '06/12345',
          ativo: false,
        },
        perfil: 'acesso',
      },
    ]);
  });

  it('na própria linha, o papel e "ativa" não aparecem para mudar', async () => {
    const escritas = tabelaDePessoas();
    const { user } = abrir();

    await user.click(await screen.findByRole('button', { name: 'Editar Gabriela Fictícia Geral' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Editar Gabriela Fictícia Geral' });
    expect(within(gaveta).queryByRole('radio')).not.toBeInTheDocument();
    expect(within(gaveta).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(gaveta).getByText(/peça a outra coordenação geral/)).toBeInTheDocument();

    await user.clear(within(gaveta).getByLabelText('Nome'));
    await user.type(within(gaveta).getByLabelText('Nome'), 'Gabriela Fictícia Renomeada');
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));
    expect(
      await screen.findByText('Alterações de Gabriela Fictícia Renomeada salvas.'),
    ).toBeInTheDocument();
    expect(escritas.at(-1)?.corpo).toMatchObject({ papel: 'coordenacao_geral', ativo: true });
  });

  it('a regra do banco aparece com a mensagem própria, e a gaveta fica aberta', async () => {
    tabelaDePessoas();
    server.use(
      http.patch(`${env.SUPABASE_URL}/rest/v1/usuarios`, () =>
        HttpResponse.json(
          { code: '23514', hint: 'coordenador_com_carteira', message: 'carteira ativa' },
          { status: 400 },
        ),
      ),
    );
    const { user } = abrir();

    await user.click(
      await screen.findByRole('button', { name: 'Editar Carla Fictícia Coordenadora' }),
    );
    const gaveta = await screen.findByRole('dialog', {
      name: 'Editar Carla Fictícia Coordenadora',
    });
    await user.click(within(gaveta).getByRole('radio', { name: 'Contas médicas' }));
    await user.click(within(gaveta).getByRole('button', { name: 'Salvar alterações' }));

    expect(await within(gaveta).findByRole('alert')).toHaveTextContent(
      'Esta pessoa tem carteira ativa. Passe a carteira para outro coordenador antes de mudar o papel.',
    );
  });

  it('e-mail repetido é recusado com o motivo', async () => {
    tabelaDePessoas();
    const { user } = abrir();
    await screen.findByRole('list', { name: LISTA });

    await user.click(screen.getByRole('button', { name: 'Nova pessoa' }));
    const gaveta = await screen.findByRole('dialog', { name: 'Nova pessoa' });
    await user.type(within(gaveta).getByLabelText('Nome'), 'Repetida Fictícia');
    await user.type(within(gaveta).getByLabelText('E-mail'), 'novo.demo@evolucao-aba.test');
    await user.click(within(gaveta).getByRole('radio', { name: 'Contas médicas' }));
    await user.click(within(gaveta).getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(await within(gaveta).findByRole('alert')).toHaveTextContent(
      'Já existe uma pessoa com este e-mail.',
    );
  });
});
