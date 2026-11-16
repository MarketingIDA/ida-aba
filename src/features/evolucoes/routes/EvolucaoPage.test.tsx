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
    pode_devolver: false,
    devolucoes: [] as Record<string, unknown>[],
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

const abrir = (usuario = usuarioDemo()) =>
  renderWithProviders(
    <Routes>
      <Route path="/evolucoes/:id" element={<EvolucaoPage />} />
    </Routes>,
    { rota: `/evolucoes/${ID}`, usuario },
  );

const parte = (titulo: string) => within(screen.getByRole('region', { name: titulo }));

const MOTIVO = 'O texto repete o do mês anterior.';

/** A devolução como a RPC `evolucao_completa` devolve, em aberto. */
const devolucaoNoBanco = () => ({
  id: 7,
  motivo: MOTIVO,
  devolvida_em: '2026-11-05T12:00:00Z',
  devolvida_por: 'Gabriela Fictícia Geral',
  resolvida_em: null as string | null,
  resolvida_por: null as string | null,
});

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

describe('Devolução pela coordenação geral', () => {
  it('a coordenação geral devolve a evolução concluída com o motivo', async () => {
    Object.assign(banco, {
      situacao: 'concluida',
      concluida_em: '2026-11-04T15:00:00Z',
      editavel: false,
      pode_devolver: true,
    });
    let enviado: unknown = null;
    server.use(
      http.post(`${REST}/devolucoes`, async ({ request }) => {
        enviado = await request.json();
        Object.assign(banco, {
          situacao: 'em_conferencia',
          concluida_em: null,
          pode_devolver: false,
          devolucoes: [devolucaoNoBanco()],
        });
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user } = abrir(usuarioDemo({ papel: 'coordenacao_geral' }));

    await user.click(await screen.findByRole('button', { name: 'Devolver com motivo' }));
    expect(screen.getByRole('button', { name: 'Devolver' })).toBeDisabled();
    await user.type(screen.getByLabelText('Motivo da devolução'), MOTIVO);
    await user.click(screen.getByRole('button', { name: 'Devolver' }));

    const bloqueio = await screen.findByRole('region', {
      name: 'Devolvida pela coordenação geral',
    });
    expect(bloqueio).toHaveTextContent(MOTIVO);
    expect(
      within(bloqueio).queryByRole('button', { name: 'Marcar como resolvida' }),
    ).not.toBeInTheDocument();
    expect(enviado).toEqual({ evolucao_id: ID, motivo: MOTIVO });
  });

  it('o coordenador vê o motivo como bloqueio e marca a devolução como resolvida', async () => {
    banco.devolucoes = [devolucaoNoBanco()];
    server.use(
      http.patch(`${REST}/devolucoes`, () => {
        banco.devolucoes = [
          {
            ...devolucaoNoBanco(),
            resolvida_em: '2026-11-05T13:00:00Z',
            resolvida_por: 'Carla Fictícia Coordenadora',
          },
        ];
        return HttpResponse.json([{ id: 7 }]);
      }),
    );
    const { user } = abrir();

    const bloqueio = await screen.findByRole('region', {
      name: 'Devolvida pela coordenação geral',
    });
    expect(bloqueio).toHaveTextContent(MOTIVO);
    expect(screen.getByText(/devolução a resolver/)).toBeInTheDocument();
    await user.click(within(bloqueio).getByRole('button', { name: 'Marcar como resolvida' }));

    expect(await screen.findByText('1 devolução resolvida')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Devolvida pela coordenação geral' }),
    ).not.toBeInTheDocument();
  });
});

describe('Termos inadequados', () => {
  it('alerta o termo da lista no texto e troca pelo substituto em um toque', async () => {
    banco.versoes = [
      {
        numero: 2,
        conteudo: {
          abertura: 'Fez birra na chegada.',
          programas: '',
          comportamentos: 'Outra Birra no fim.',
          recursos: '',
          fechamento: '',
        },
        autor: 'coordenador',
        criado_em: '2026-11-04T15:00:00Z',
        criado_por: 'Carla',
      },
    ];
    server.use(
      http.get(`${REST}/termos_inadequados`, () =>
        HttpResponse.json([{ termo: 'birra', substituto: 'desregulação emocional' }]),
      ),
    );
    const { user } = abrir();

    const alertas = await screen.findByRole('list', { name: 'Termos inadequados no texto' });
    expect(alertas).toHaveTextContent('Termo inadequado: “birra”.');
    await user.click(
      within(alertas).getByRole('button', { name: 'Trocar “birra” por “desregulação emocional”' }),
    );

    expect(
      await parte('Evolução mensal').findByText(/Fez desregulação emocional/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Termos inadequados no texto' }),
    ).not.toBeInTheDocument();
    expect(banco.versoes.find((v) => v.numero === 2)?.conteudo).toMatchObject({
      abertura: 'Fez desregulação emocional na chegada.',
      comportamentos: 'Outra Desregulação emocional no fim.',
    });
  });
});
