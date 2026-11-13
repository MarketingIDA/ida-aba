import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { ArquivoDoMesPage } from '@/features/arquivo-do-mes';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { carteiraDaRpc, carteiraDoMes } from '@/testing/factories/arquivos';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const REST = `${env.SUPABASE_URL}/rest/v1`;

/** O banco em memória: a carteira enviada volta com o arquivo, como a tela lê depois do envio. */
function servirBanco() {
  const banco = { enviadas: [] as number[] };
  const carteiras = () => [
    carteiraDoMes({
      arquivo: banco.enviadas.includes(1)
        ? { id: 9, enviadoEm: '2026-11-04T15:00:00Z', evolucoes: 3 }
        : null,
    }),
    // Quem coordena duas carteiras envia dois arquivos: esta ainda tem pendências.
    carteiraDoMes({
      carteiraId: 2,
      turno: 'tarde',
      assistidos: 4,
      concluidas: 2,
      emConferencia: 1,
      semEvolucao: 1,
      comAssinatura: false,
    }),
  ];
  server.use(
    http.post(`${REST}/rpc/arquivos_do_mes`, () =>
      HttpResponse.json(carteiras().map(carteiraDaRpc)),
    ),
    http.post(`${REST}/arquivos`, async ({ request }) => {
      const { carteira_id } = (await request.json()) as { carteira_id: number };
      banco.enviadas.push(carteira_id);
      return new HttpResponse(null, { status: 201 });
    }),
  );
  return banco;
}

// 04/11/2026, meio-dia em Recife: o mês aberto é novembro e o prazo (10/11) está a 6 dias.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Arquivo do mês, coordenador', () => {
  it('mostra o que falta em cada carteira, envia a que está pronta e mostra o recibo', async () => {
    const banco = servirBanco();
    const { user, container } = renderWithProviders(<ArquivoDoMesPage />, {
      usuario: usuarioDemo(),
    });

    const pendente = within(
      await screen.findByRole('article', { name: 'Unidade Fictícia · Tarde' }),
    );
    expect(pendente.getByText('2 pendências')).toBeInTheDocument();
    expect(pendente.getByText(/Faltam 1 em conferência e 1 sem evolução\./)).toBeInTheDocument();
    expect(pendente.getByRole('link', { name: 'Cadastrar a assinatura' })).toHaveAttribute(
      'href',
      '/assinatura',
    );
    expect(pendente.getByRole('button', { name: 'Enviar a contas médicas' })).toBeDisabled();

    const pronta = within(screen.getByRole('article', { name: 'Unidade Fictícia · Manhã' }));
    expect(pronta.getByText('Pronto para enviar')).toBeInTheDocument();
    expect(pronta.getByText('3 de 3 evoluções concluídas')).toBeInTheDocument();
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.click(pronta.getByRole('button', { name: 'Enviar a contas médicas' }));
    expect(pronta.getByRole('group', { name: 'Confirmar o envio' })).toHaveTextContent(
      'Enviar o arquivo de novembro com 3 evoluções?',
    );
    expect(banco.enviadas).toEqual([]);
    await user.click(pronta.getByRole('button', { name: 'Enviar o arquivo' }));

    expect(
      await pronta.findByText(/Enviado a contas médicas em 04\/11\/2026 às 12:00, com 3 evoluções/),
    ).toBeInTheDocument();
    expect(pronta.getByText('Enviado')).toBeInTheDocument();
    expect(banco.enviadas).toEqual([1]);
  });
});
