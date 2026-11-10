import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { EvolucaoPage } from '@/features/evolucoes';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const ID = '00000000-0000-4000-8000-000000000001';
const REST = `${env.SUPABASE_URL}/rest/v1`;

type Banco = ReturnType<typeof evolucaoNoBanco>;

/** A evolução como a RPC `evolucao_completa` devolve. Nenhum nome aqui é de pessoa real. */
function evolucaoNoBanco() {
  return {
    id: ID,
    codigo: 'UNA-2611-001-EV',
    mes_ref: '2026-11-01',
    situacao: 'em_conferencia',
    origem: 'manual',
    concluida_em: null as string | null,
    periodo_inicio: '2026-10-01',
    periodo_fim: '2026-10-31',
    assistido: 'Alice Fictícia Moura',
    plano: 'Plano Fictício' as string | null,
    unidade: 'Unidade Fictícia',
    turno: 'manha',
    coordenador: 'Carla Fictícia Coordenadora',
    editavel: true,
    partes: [1, 2, 3, 4].map((numero) => ({
      numero,
      conferida_em: null as string | null,
      conferida_por: null as string | null,
    })),
    versoes: [] as ({ numero: number; conteudo: unknown } & Record<string, unknown>)[],
  };
}

/** O banco em memória: versão nova desfaz a conferência da parte, como o trigger. */
function servirBanco(banco: Banco) {
  server.use(
    http.post(`${REST}/rpc/evolucao_completa`, () => HttpResponse.json(banco)),
    http.post(`${REST}/versoes`, async ({ request }) => {
      const { numero, conteudo } = (await request.json()) as { numero: number; conteudo: unknown };
      const versao = { numero, conteudo, autor: 'coordenador', criado_em: '2026-11-04T15:00:00Z' };
      banco.versoes = [
        ...banco.versoes.filter((v) => v.numero !== numero),
        { ...versao, criado_por: 'Carla' },
      ];
      const parte = banco.partes.find((p) => p.numero === numero);
      if (parte !== undefined) Object.assign(parte, { conferida_em: null, conferida_por: null });
      return new HttpResponse(null, { status: 201 });
    }),
    http.patch(`${REST}/partes`, async ({ request }) => {
      const numero = Number(new URL(request.url).searchParams.get('numero')?.slice(3));
      const { conferida } = (await request.json()) as { conferida: boolean };
      const parte = banco.partes.find((p) => p.numero === numero);
      if (parte !== undefined) parte.conferida_em = conferida ? '2026-11-04T15:00:00Z' : null;
      return HttpResponse.json([{ numero }]);
    }),
    http.patch(`${REST}/evolucoes`, async ({ request }) => {
      const { situacao } = (await request.json()) as { situacao: string };
      Object.assign(banco, { situacao, concluida_em: '2026-11-04T15:00:00Z' });
      return HttpResponse.json([{ id: ID }]);
    }),
  );
}

const abrir = () =>
  renderWithProviders(
    <Routes>
      <Route path="/evolucoes/:id" element={<EvolucaoPage />} />
    </Routes>,
    { rota: `/evolucoes/${ID}`, usuario: usuarioDemo() },
  );

const parte = (titulo: string) => within(screen.getByRole('region', { name: titulo }));

let banco: Banco;

beforeEach(() => {
  banco = evolucaoNoBanco();
  servirBanco(banco);
});

describe('Evolução escrita à mão', () => {
  it('escreve o texto e as metas, confere as 4 partes e conclui', async () => {
    const { user } = abrir();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Alice Fictícia Moura',
    );
    expect(parte('Evolução mensal').getByText('0 linhas · mínimo 7')).toBeInTheDocument();

    await user.click(parte('Evolução mensal').getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByLabelText('Programas trabalhados'));
    await user.paste('Texto fictício de teste. '.repeat(25));
    await user.click(screen.getByRole('button', { name: 'Salvar o texto' }));
    expect(await parte('Evolução mensal').findByText('7 linhas · mínimo 7')).toBeInTheDocument();

    await user.click(parte('Metas para o mês atual').getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByLabelText('Metas'));
    await user.paste('Meta um\n\nMeta dois\nMeta três\n  Meta quatro  ');
    await user.click(screen.getByRole('button', { name: 'Salvar as metas' }));
    expect(await screen.findByText('Meta quatro')).toBeInTheDocument();
    expect(banco.versoes.find((v) => v.numero === 4)?.conteudo).toEqual({
      metas: ['Meta um', 'Meta dois', 'Meta três', 'Meta quatro'],
    });

    for (const titulo of [
      'Identificação',
      'Evolução mensal',
      'Metas alcançadas',
      'Metas para o mês atual',
    ]) {
      await user.click(parte(titulo).getByRole('button', { name: 'Marcar como conferida' }));
      expect(
        await parte(titulo).findByRole('button', { name: 'Desfazer conferência' }),
      ).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'Concluir evolução' }));
    expect(await screen.findByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
    expect(banco.situacao).toBe('concluida');
  });

  it('sem plano no cadastro, a identificação não se confere e a recusa do banco aparece', async () => {
    banco.plano = null;
    server.use(
      http.patch(`${REST}/partes`, () =>
        HttpResponse.json(
          { code: '23514', hint: 'evolucao_fechada', message: 'x' },
          { status: 400 },
        ),
      ),
    );
    const { user } = abrir();
    await screen.findByRole('heading', { level: 1 });
    expect(
      await parte('Identificação').findByText(/plano de saúde está em branco/),
    ).toBeInTheDocument();
    expect(
      parte('Identificação').getByRole('button', { name: 'Marcar como conferida' }),
    ).toBeDisabled();

    await user.click(
      parte('Metas alcançadas').getByRole('button', { name: 'Marcar como conferida' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Reabra antes de mudar');
  });
});
