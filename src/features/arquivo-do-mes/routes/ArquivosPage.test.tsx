import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { ArquivosPage } from '@/features/arquivo-do-mes';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { carteiraDaRpc, carteiraDoMes, evolucaoDaRpc } from '@/testing/factories/arquivos';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const REST = `${env.SUPABASE_URL}/rest/v1`;

/** Como contas médicas recebe: o nome só de quem já enviou, e nada da assinatura. */
const CARTEIRAS = [
  carteiraDoMes({
    minha: false,
    comAssinatura: null,
    assistidos: 2,
    concluidas: 2,
    arquivo: { id: 9, enviadoEm: '2026-11-04T14:03:00Z', evolucoes: 2 },
  }),
  carteiraDoMes({
    carteiraId: 2,
    unidadeSigla: 'UNB',
    unidadeNome: 'Outra Unidade Fictícia',
    turno: 'tarde',
    coordenador: null,
    minha: false,
    comAssinatura: null,
    assistidos: 4,
    concluidas: 1,
    emConferencia: 1,
    semEvolucao: 2,
  }),
];

const EVOLUCOES = [
  {
    id: '00000000-0000-4000-8000-000000000004',
    codigo: 'UNA-2611-004-EV',
    assistido: 'Davi Fictício Nunes',
    plano: 'Plano Fictício',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    codigo: 'UNA-2611-005-EV',
    assistido: 'Elisa Fictícia Torres',
    plano: null,
  },
];

const card = (nome: RegExp) => screen.getByRole('button', { name: nome });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
  server.use(
    http.post(`${REST}/rpc/arquivos_do_mes`, () => HttpResponse.json(CARTEIRAS.map(carteiraDaRpc))),
    http.post(`${REST}/rpc/evolucoes_do_arquivo`, () =>
      HttpResponse.json(EVOLUCOES.map(evolucaoDaRpc)),
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Arquivos recebidos, contas médicas', () => {
  it('mostra o que chegou e o que falta, filtra pelos cards e abre as evoluções do arquivo', async () => {
    const { user, container } = renderWithProviders(<ArquivosPage />, {
      usuario: usuarioDemo({ papel: 'contas_medicas' }),
    });

    const lista = await screen.findByRole('list', { name: 'Arquivos de novembro' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Arquivos recebidos nov/2026',
    );
    expect(
      within(lista).getByText(
        'Carla Fictícia Coordenadora · 2 evoluções · recebido em 04/11/2026 às 11:03',
      ),
    ).toBeInTheDocument();
    expect(within(lista).getByText('1 de 4 evoluções concluídas')).toBeInTheDocument();
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.click(card(/A chegar/));
    expect(within(lista).getByText('Outra Unidade Fictícia · Tarde')).toBeInTheDocument();
    expect(within(lista).queryByText('Unidade Fictícia · Manhã')).not.toBeInTheDocument();

    await user.click(card(/Recebidos/));
    await user.click(within(lista).getByRole('button', { name: 'Ver 2 evoluções' }));
    const evolucoes = await within(lista).findByRole('list', { name: 'Evoluções do arquivo' });
    expect(within(evolucoes).getByText('Davi Fictício Nunes')).toBeInTheDocument();
    expect(within(evolucoes).getByText('UNA-2611-005-EV')).toBeInTheDocument();
    expect(within(evolucoes).getByText('plano em branco')).toBeInTheDocument();
    // Contas médicas não abre a evolução: o nome não é link.
    expect(within(evolucoes).queryByRole('link')).not.toBeInTheDocument();
  });
});
