import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { EvolucoesPage } from '@/features/evolucoes';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { linhaDaRpc, MES_DEMO, unidadesDemo } from '@/testing/factories/evolucoes';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const RPC = `${env.SUPABASE_URL}/rest/v1/rpc/evolucoes_do_mes`;

const abrir = (rota = '/evolucoes', papel: 'coordenador' | 'coordenacao_geral' = 'coordenador') =>
  renderWithProviders(<EvolucoesPage />, { rota, usuario: usuarioDemo({ papel }) });

const NOMES = unidadesDemo().map((l) => l.nome);

/** Os nomes na ordem da lista (cada linha começa pelas iniciais e o nome). */
const nomesDaLista = () =>
  within(screen.getByRole('list', { name: 'Evoluções de novembro' }))
    .getAllByRole('listitem')
    .map((item) => NOMES.find((nome) => item.textContent.includes(nome)));

const card = (nome: RegExp) => screen.getByRole('button', { name: nome });

// 04/11/2026, meio-dia em Recife: o mês aberto é novembro e o prazo (10/11) está a 6 dias.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Evoluções do mês, coordenador', () => {
  it('mostra o mês, o período e o prazo, os cards e a lista em ordem de trabalho', async () => {
    abrir();
    expect(screen.getByRole('status', { name: 'Carregando as evoluções' })).toBeInTheDocument();

    expect(await screen.findByRole('list', { name: 'Evoluções de novembro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Evoluções nov/2026');
    expect(
      screen.getByText(
        'Sua carteira em Unidade Fictícia, turno da manhã. Sessões de 01/10 a 31/10/2026; o arquivo do mês vai a contas médicas até 10/11 (faltam 6 dias).',
      ),
    ).toBeInTheDocument();
    expect(card(/Carteira 5 assistidos/)).toHaveAttribute('aria-pressed', 'true');
    expect(card(/Sem evolução 2/)).toBeInTheDocument();
    expect(card(/Em conferência 1/)).toBeInTheDocument();
    expect(nomesDaLista()).toEqual([
      'Cecília Fictícia Rios',
      'Alice Fictícia Moura',
      'Bento Fictício Prado',
      'Davi Fictício Nunes',
      'Elisa Fictícia Torres',
    ]);
    expect(screen.getByText('2/4 partes')).toBeInTheDocument();
    expect(screen.getAllByText('Ainda sem evolução de novembro')).toHaveLength(2);
    expect(
      screen.getByText('Faltam 3 evoluções para o arquivo do mês · prazo 10/11, faltam 6 dias'),
    ).toBeInTheDocument();
  });

  it('o card filtra a lista; clicar de novo, ou no chip, tira o filtro', async () => {
    const { user } = abrir();
    await screen.findByRole('list', { name: 'Evoluções de novembro' });

    await user.click(card(/Concluídas 1/));
    expect(card(/Concluídas 1/)).toHaveAttribute('aria-pressed', 'true');
    expect(nomesDaLista()).toEqual(['Davi Fictício Nunes']);

    await user.click(screen.getByRole('button', { name: 'Tirar o filtro Concluídas' }));
    expect(nomesDaLista()).toHaveLength(5);
    expect(card(/Carteira/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('busca por nome sem acento e oferece tirar os filtros quando nada bate', async () => {
    const { user } = abrir();
    const busca = await screen.findByRole('searchbox', { name: 'Buscar assistido ou código' });

    await user.type(busca, 'cecilia');
    expect(nomesDaLista()).toEqual(['Cecília Fictícia Rios']);

    await user.type(busca, ' xyz');
    expect(
      screen.getByRole('heading', { name: 'Nenhum assistido encontrado' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tirar os filtros' }));
    expect(busca).toHaveValue('');
    expect(nomesDaLista()).toHaveLength(5);
  });

  it('em outro mês, sem assistidos, explica que a carteira ainda está vazia', async () => {
    const { user } = abrir();
    await screen.findByRole('list', { name: 'Evoluções de novembro' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), '2026-10-01');
    expect(
      await screen.findByRole('heading', { name: 'Sua carteira ainda não tem assistidos' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/o prazo do arquivo do mês foi 10\/10/)).toBeInTheDocument();
  });

  it('mês inválido na URL cai no mês aberto', async () => {
    abrir('/evolucoes?mes=2020-01-01&situacao=qualquer');
    expect(await screen.findByRole('list', { name: 'Evoluções de novembro' })).toBeInTheDocument();
    expect(card(/Carteira/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('falha do banco: explica e deixa tentar de novo', async () => {
    server.use(http.post(RPC, () => HttpResponse.json({ message: 'erro' }, { status: 500 })));
    const { user } = abrir();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as evoluções agora',
    );
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('list', { name: 'Evoluções de novembro' })).toBeInTheDocument();
  });

  it('resposta fora do formato não quebra a tela', async () => {
    server.use(http.post(RPC, () => HttpResponse.json([{ nome: 'sem o resto' }])));
    abrir();
    expect(await screen.findByRole('alert')).toHaveTextContent('formato inesperado');
  });

  it('não tem violação de acessibilidade', async () => {
    const { container } = abrir();
    await screen.findByRole('list', { name: 'Evoluções de novembro' });
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});

describe('Evoluções do mês, coordenação geral', () => {
  beforeEach(() => {
    server.use(
      http.post(RPC, async ({ request }) => {
        const corpo = (await request.json()) as { p_mes?: string };
        return HttpResponse.json(corpo.p_mes === MES_DEMO ? unidadesDemo().map(linhaDaRpc) : []);
      }),
    );
  });

  it('vê todas as unidades e recorta por unidade e coordenador', async () => {
    const { user } = abrir('/evolucoes', 'coordenacao_geral');

    await screen.findByRole('list', { name: 'Evoluções de novembro' });
    expect(screen.getByText(/^Todas as unidades\. Sessões de 01\/10/)).toBeInTheDocument();
    expect(card(/Assistidos 6 assistidos/)).toBeInTheDocument();
    expect(await screen.findAllByText(/UNA manhã · Carla Coordenadora/)).not.toHaveLength(0);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade' }), 'UNB');
    expect(card(/Assistidos 1 no recorte/)).toBeInTheDocument();
    expect(nomesDaLista()).toEqual(['Fábio Fictício Lopes']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Coordenador' }), '2');
    expect(nomesDaLista()).toHaveLength(5);
  });
});
