import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

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
    expect(screen.getByText('Mesmo degrau há 4 semanas')).toBeInTheDocument();
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
});
