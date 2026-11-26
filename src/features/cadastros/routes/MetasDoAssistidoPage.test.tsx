import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { MetasDoAssistidoPage, MetasPage } from '@/features/cadastros';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const REST = `${env.SUPABASE_URL}/rest/v1`;

/** O cadastro de metas em memória: a meta gravada volta na lista. Nada aqui é de pessoa real. */
function servirMetas() {
  const metas: Record<string, unknown>[] = [
    {
      id: 1,
      assistido_id: 1,
      programa: 'Imitação',
      texto: 'Imitar três ações com objeto',
      criterio: '80% em três sessões seguidas',
      situacao: 'desenvolvimento',
      situacao_em: '2026-11-01T12:00:00Z',
    },
    {
      id: 2,
      assistido_id: 1,
      programa: null,
      texto: 'Atender ao próprio nome',
      criterio: 'Em todas as sessões da semana',
      situacao: 'alcancada',
      situacao_em: '2026-10-20T12:00:00Z',
    },
  ];
  server.use(
    http.get(`${REST}/metas`, () => HttpResponse.json(metas)),
    http.post(`${REST}/metas`, async ({ request }) => {
      const corpo = (await request.json()) as Record<string, unknown>;
      const nova = { ...corpo, id: metas.length + 1, situacao_em: '2026-11-04T15:00:00Z' };
      metas.push(nova);
      return HttpResponse.json([nova], { status: 201 });
    }),
  );
  return metas;
}

const card = (nome: RegExp) => screen.getByRole('button', { name: nome });

describe('Metas do assistido, coordenador', () => {
  it('mostra o plano terapêutico, filtra pelos cards e cadastra uma meta nova', async () => {
    const metas = servirMetas();
    const { user, container } = renderWithProviders(
      <Routes>
        <Route path="/metas/:assistidoId" element={<MetasDoAssistidoPage />} />
      </Routes>,
      { rota: '/metas/1', usuario: usuarioDemo() },
    );

    const lista = await screen.findByRole('list', { name: 'Metas' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ana Fictícia Souza' }),
    ).toBeInTheDocument();
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lista).getByText('80% em três sessões seguidas')).toBeInTheDocument();
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.click(card(/Alcançadas/));
    expect(within(lista).getByText('Atender ao próprio nome')).toBeInTheDocument();
    expect(within(lista).queryByText('Imitar três ações com objeto')).not.toBeInTheDocument();
    await user.click(card(/Alcançadas/));

    await user.click(screen.getByRole('button', { name: 'Nova meta' }));
    await user.type(screen.getByLabelText('Meta'), 'Pedir ajuda com gesto');
    await user.type(screen.getByLabelText('Critério de alcance'), 'Sem dica em duas sessões');
    await user.click(screen.getByRole('button', { name: 'Cadastrar meta' }));

    expect(await within(lista).findByText('Pedir ajuda com gesto')).toBeInTheDocument();
    expect(metas.at(-1)).toMatchObject({
      assistido_id: 1,
      programa: null,
      texto: 'Pedir ajuda com gesto',
      criterio: 'Sem dica em duas sessões',
      situacao: 'desenvolvimento',
    });
    // A meta em desenvolvimento sem programa pede para ser completada.
    expect(within(lista).getByText(/^Falta o programa\./)).toBeInTheDocument();
  });
});

describe('Metas dos assistidos', () => {
  it('o coordenador vê só os da carteira dele, com o resumo das metas', async () => {
    servirMetas();
    renderWithProviders(<MetasPage />, { usuario: usuarioDemo() });

    const lista = await screen.findByRole('list', { name: 'Assistidos' });
    expect(within(lista).getByRole('link', { name: 'Ana Fictícia Souza' })).toHaveAttribute(
      'href',
      '/metas/1',
    );
    expect(within(lista).getByText('1 em desenvolvimento')).toBeInTheDocument();
    // Caio está na carteira de outro coordenador: o cadastro mostra, as metas não.
    expect(within(lista).queryByRole('link', { name: 'Caio Fictício Lima' })).toBeNull();
  });
});
