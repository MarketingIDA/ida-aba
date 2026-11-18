import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { OrientacoesPage } from '@/features/orientacoes';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const REST = `${env.SUPABASE_URL}/rest/v1`;

/** A curadoria em memória: aprovar grava a orientação e decide a dica, como os triggers. */
function servirCuradoria() {
  const dica = {
    id: 4,
    campo: 'programas',
    texto_original: 'Texto fictício que a IA escreveu.',
    dica: 'Citar o nível de ajuda de cada programa.',
    situacao: 'pendente',
    criado_em: '2026-11-05T12:00:00Z',
    criado_por_nome: 'Carla Fictícia Coordenadora',
    decidida_em: null as string | null,
    decidida_por_nome: null as string | null,
    motivo: null,
  };
  const antiga = {
    id: 1,
    campo: 'abertura',
    texto: 'Comece pela frequência do mês.',
    ativa: true,
    criado_em: '2026-11-02T12:00:00Z',
  };
  const orientacoes = [antiga];
  const escritas: unknown[] = [];
  server.use(
    http.get(`${REST}/dicas_ia`, () => HttpResponse.json([dica])),
    http.get(`${REST}/orientacoes_ia`, () => HttpResponse.json(orientacoes)),
    http.post(`${REST}/orientacoes_ia`, async ({ request }) => {
      const corpo = (await request.json()) as { dica_id: number; texto: string };
      escritas.push(corpo);
      orientacoes.unshift({ ...antiga, id: 2, campo: 'programas', texto: corpo.texto });
      Object.assign(dica, {
        situacao: 'aprovada',
        decidida_em: '2026-11-06T12:00:00Z',
        decidida_por_nome: 'Gabriela Fictícia Geral',
      });
      return new HttpResponse(null, { status: 201 });
    }),
    http.patch(`${REST}/orientacoes_ia`, async ({ request }) => {
      const corpo = (await request.json()) as { ativa: boolean };
      escritas.push(corpo);
      antiga.ativa = corpo.ativa;
      return HttpResponse.json([{ id: antiga.id }]);
    }),
  );
  return escritas;
}

describe('Orientações da IA, coordenação geral', () => {
  it('aprova a dica pendente com a redação ajustada e retira uma orientação', async () => {
    const escritas = servirCuradoria();
    const { user, container } = renderWithProviders(<OrientacoesPage />, {
      usuario: usuarioDemo({ papel: 'coordenacao_geral' }),
    });

    const dicas = await screen.findByRole('list', { name: 'Dicas para a IA' });
    expect(within(dicas).getByText('Citar o nível de ajuda de cada programa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendentes/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);

    await user.click(within(dicas).getByRole('button', { name: 'Aprovar a dica 4' }));
    const campo = screen.getByLabelText('Orientação para a IA');
    expect(campo).toHaveValue('Citar o nível de ajuda de cada programa.');
    await user.clear(campo);
    await user.type(campo, 'Cite o nível de ajuda de cada programa.');
    await user.click(screen.getByRole('button', { name: 'Aprovar como orientação' }));

    const orientacoes = screen.getByRole('list', { name: 'Orientações da IA' });
    expect(
      await within(orientacoes).findByText('Cite o nível de ajuda de cada programa.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Nenhuma dica à espera')).toBeInTheDocument();

    await user.click(within(orientacoes).getByRole('button', { name: 'Retirar a orientação 1' }));
    expect(
      await within(orientacoes).findByRole('button', { name: 'Voltar a usar a orientação 1' }),
    ).toBeInTheDocument();
    expect(escritas).toEqual([
      { dica_id: 4, texto: 'Cite o nível de ajuda de cada programa.' },
      { ativa: false },
    ]);
  });
});
