import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { ProgressoPage } from '@/features/progresso';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const REST = `${env.SUPABASE_URL}/rest/v1`;
const EVOLUCAO = '00000000-0000-4000-8000-000000000001';

/** Um mês lido, duas metas: uma chegou à independência, a outra está parada. Tudo fictício. */
function servirProgresso() {
  const meta = (id: number, programa: string, texto: string) => ({
    id,
    assistido_id: 1,
    programa,
    texto,
    criterio: 'Critério fictício',
    situacao: 'desenvolvimento',
    situacao_em: '2026-10-01T12:00:00Z',
  });
  const nivel = (meta_id: number, data: string, n: number) => ({
    meta_id,
    data,
    nivel: n,
    trecho: `Trecho fictício de ${data}.`,
  });
  server.use(
    http.get(`${REST}/metas`, () =>
      HttpResponse.json([
        meta(1, 'Imitação', 'Imitar três ações com objeto'),
        meta(2, 'Pareamento', 'Parear figuras iguais'),
      ]),
    ),
    http.get(`${REST}/evolucoes`, () =>
      HttpResponse.json([
        {
          id: EVOLUCAO,
          codigo: 'TST-2611-001-EV',
          mes_ref: '2026-10-01',
          periodo_inicio: '2026-10-01',
          periodo_fim: '2026-10-31',
        },
      ]),
    ),
    http.get(`${REST}/leituras_de_nivel`, () =>
      HttpResponse.json([{ evolucao_id: EVOLUCAO, situacao: 'lida' }]),
    ),
    // A carteira: o próprio assistido e dois lidos sem meta independente. Sem nome nem meta.
    http.post(`${REST}/rpc/independencia_da_carteira`, () =>
      HttpResponse.json([
        { assistido: 1, independente_em: '2026-10-20' },
        { assistido: 2, independente_em: null },
        { assistido: 3, independente_em: null },
      ]),
    ),
    http.get(`${REST}/niveis_de_apoio`, () =>
      HttpResponse.json([
        nivel(2, '2026-10-01', 2),
        nivel(1, '2026-10-02', 2),
        nivel(1, '2026-10-20', 5),
      ]),
    ),
  );
}

describe('Evolução das metas em gráfico (E27)', () => {
  it('mostra a escada de cada meta e a mediana da carteira, filtra pelas que pedem atenção e troca para a tabela', async () => {
    servirProgresso();
    const { user, container } = renderWithProviders(
      <Routes>
        <Route path="/progresso/:assistidoId" element={<ProgressoPage />} />
      </Routes>,
      { rota: '/progresso/1', usuario: usuarioDemo() },
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Fictícia Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('de 2 metas já chegou à independência')).toBeInTheDocument();
    expect(screen.getByText('mesmo degrau há 4 semanas')).toBeInTheDocument();
    expect(
      await screen.findByText('Acima da mediana da carteira, que é de 0 metas'),
    ).toBeInTheDocument();
    expect(screen.getByText('Mediana da carteira · 3 assistidos')).toBeInTheDocument();
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: /Pedem atenção/ }));
    expect(screen.getByText('Parear figuras iguais')).toBeInTheDocument();
    expect(screen.queryByText('Imitar três ações com objeto')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(
      screen.getByRole('table', { name: 'Cada sessão, com a frase da análise' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Trecho fictício de 2026-10-01.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mediana da carteira' })).toBeInTheDocument();
  });

  it('não baixa o PDF quando o registro de quem baixou é recusado', async () => {
    servirProgresso();
    server.use(
      http.post(`${REST}/relatorios_de_metas`, () =>
        HttpResponse.json({ code: '42501', message: 'permission denied' }, { status: 403 }),
      ),
    );
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/progresso/:assistidoId" element={<ProgressoPage />} />
      </Routes>,
      { rota: '/progresso/1', usuario: usuarioDemo() },
    );

    await user.click(await screen.findByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para emitir o relatório deste assistido.',
    );
    expect(screen.queryByText(/Baixado:/)).not.toBeInTheDocument();
  });

  it('envia o PDF pela janela de compartilhar e, sem envio de arquivo no navegador, baixa para anexar', async () => {
    servirProgresso();
    const acoes: unknown[] = [];
    server.use(
      http.get('*/logo-instituto-autismo.png', () => new HttpResponse(null, { status: 404 })),
      http.get(`${REST}/relatorios_de_metas`, () => HttpResponse.json([])),
      http.post(`${REST}/relatorios_de_metas`, async ({ request }) => {
        acoes.push(await request.json());
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const criar = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/progresso/:assistidoId" element={<ProgressoPage />} />
      </Routes>,
      { rota: '/progresso/1', usuario: usuarioDemo() },
    );

    await user.click(await screen.findByRole('button', { name: 'Compartilhar' }));
    expect(await screen.findByText('Nenhum download ou envio ainda.')).toBeInTheDocument();
    const enviar = screen.getByRole('button', { name: /Enviar o PDF/ });
    await waitFor(() => {
      expect(enviar).toBeEnabled();
    });
    await user.click(enviar);
    expect(await screen.findByText(/o PDF foi baixado para você anexar/)).toBeInTheDocument();
    expect(acoes).toEqual([{ assistido_id: 1, acao: 'baixou_para_enviar' }]);
    expect(criar).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});

describe('Evolução das metas sem os níveis lidos', () => {
  it('pede a leitura daqui mesmo quando as metas entraram no cadastro depois', async () => {
    servirProgresso();
    const leituras = [{ evolucao_id: EVOLUCAO, situacao: 'sem_metas' }];
    server.use(
      http.get(`${REST}/leituras_de_nivel`, () => HttpResponse.json(leituras)),
      http.post(`${env.SUPABASE_URL}/functions/v1/ler-niveis`, () => {
        leituras[0] = { evolucao_id: EVOLUCAO, situacao: 'lida' };
        return HttpResponse.json({ ok: true, situacao: 'lida' });
      }),
    );
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/progresso/:assistidoId" element={<ProgressoPage />} />
      </Routes>,
      { rota: '/progresso/1', usuario: usuarioDemo() },
    );

    expect(
      await screen.findByRole('heading', { name: 'Os níveis de apoio precisam ser lidos de novo' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ler os níveis agora' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Os níveis de apoio precisam ser lidos de novo' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Ler os níveis agora' })).not.toBeInTheDocument();
  });
});
