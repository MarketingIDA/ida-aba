import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { EvolucaoPage } from '@/features/evolucoes';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

// O PDF, o Word e a foto são lidos pelo pdf.js, pelo mammoth e pelo OCR; aqui a leitura devolve
// um texto pronto. A foto traz o nome da assistida, que sai do texto.
vi.mock('@/features/evolucoes/documentos/lerDocumento', () => ({
  ACEITOS: '.pdf,.docx,.jpg',
  ACEITOS_DA_FOTO: '.jpg',
  lerDocumento: (arquivo: File) => {
    const imagem = arquivo.name.endsWith('.jpg');
    return Promise.resolve({
      arquivo: arquivo.name,
      paginas: imagem ? null : 1,
      texto: imagem
        ? 'Bilhete da família de 20/10/2026. Alice dormiu bem.'
        : 'Relatório da escola de 20/10/2026. A criança participa da roda.',
      imagem,
    });
  },
}));

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

/** As lacunas como a RPC `lacunas` devolve (E10), e as fontes como `fontes_da_evolucao` (E06). */
let lacunasNoBanco: Record<string, unknown>[] = [];
let fontesNoBanco: Record<string, unknown>[] = [];

/** O banco em memória: versão nova desfaz a conferência da parte, como o trigger. */
function servirBanco(banco: Banco) {
  server.use(
    http.post(`${REST}/rpc/evolucao_completa`, () => HttpResponse.json(banco)),
    http.post(`${REST}/rpc/lacunas`, () => HttpResponse.json(lacunasNoBanco)),
    http.post(`${REST}/rpc/fontes_da_evolucao`, () => HttpResponse.json(fontesNoBanco)),
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
  lacunasNoBanco = [];
  fontesNoBanco = [];
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

describe('Dica para a IA', () => {
  it('o coordenador deixa a dica num bloco da IA, sem o nome do assistido', async () => {
    Object.assign(banco, { genero: 'feminino', partes_da_ia: [3] });
    banco.versoes = [
      {
        numero: 3,
        conteudo: { metas: ['Meta fictícia da IA'] },
        autor: 'ia',
        criado_em: '2026-11-04T15:00:00Z',
        criado_por: null,
      },
    ];
    let enviado: unknown = null;
    server.use(
      http.post(`${REST}/dicas_ia`, async ({ request }) => {
        enviado = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user } = abrir();

    await user.click(
      await screen.findByRole('button', { name: 'Dica para a IA sobre Metas alcançadas' }),
    );
    await user.type(
      screen.getByLabelText(/O que a IA deve fazer diferente/),
      'A meta da Alice precisa do critério.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar dica' }));

    expect(await screen.findByText('Dica enviada à coordenação geral.')).toBeInTheDocument();
    expect(enviado).toEqual({
      evolucao_id: ID,
      campo: 'metas_alcancadas',
      dica: 'A meta da a assistida precisa do critério.',
    });
    // Só a parte que tem texto da IA ganha a dica.
    expect(
      screen.queryByRole('button', { name: 'Dica para a IA sobre Metas para o mês atual' }),
    ).not.toBeInTheDocument();
  });
});

describe('Outros documentos', () => {
  it('sem o nome no texto, o documento espera a confirmação e só então é gravado', async () => {
    const gravados: Record<string, unknown>[] = [];
    server.use(
      http.get(`${REST}/documentos`, () =>
        HttpResponse.json(gravados.map((d, i) => ({ id: i + 1, ...d }))),
      ),
      http.post(`${REST}/documentos`, async ({ request }) => {
        gravados.push((await request.json()) as Record<string, unknown>);
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user } = abrir();

    await user.upload(
      await screen.findByLabelText('Outros documentos'),
      new File(['x'], 'Relatorio ficticio.pdf', { type: 'application/pdf' }),
    );

    expect(
      await screen.findByText(/O nome de Alice Fictícia Moura não aparece/),
    ).toBeInTheDocument();
    expect(gravados).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'É de Alice' }));

    expect(await screen.findByLabelText('Tipo de Relatorio ficticio.pdf')).toHaveValue('escola');
    expect(gravados).toEqual([
      expect.objectContaining({
        evolucao_id: ID,
        arquivo_nome: 'Relatorio ficticio.pdf',
        tipo: 'escola',
        data_documento: '2026-10-20',
        trocas: 0,
        confirmado: true,
      }),
    ]);
    expect(
      screen.getByText(/Do período analisado. Confirmado como do assistido./),
    ).toBeInTheDocument();
  });
  it('a foto passa pela conferência mesmo com o nome trocado, com o texto lido aberto', async () => {
    Object.assign(banco, { genero: 'feminino' });
    const gravados: Record<string, unknown>[] = [];
    server.use(
      http.post(`${REST}/documentos`, async ({ request }) => {
        gravados.push((await request.json()) as Record<string, unknown>);
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const { user } = abrir();

    await user.upload(
      await screen.findByLabelText('Foto do documento'),
      new File(['x'], 'Bilhete.jpg', { type: 'image/jpeg' }),
    );

    expect(await screen.findByText(/Texto lido da foto/)).toBeInTheDocument();
    expect(screen.getByText(/a assistida dormiu bem/)).toBeVisible();
    expect(screen.getByText('20/10/2026 · foto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conferi: é de Alice' }));
    await vi.waitFor(() => {
      expect(gravados).toEqual([expect.objectContaining({ trocas: 1, confirmado: true })]);
    });
  });
});

describe('Nível de apoio', () => {
  it('o coordenador pede a leitura dos níveis e vê quantos dias e metas a IA leu', async () => {
    const lidas: Record<string, unknown>[] = [];
    const pedidos: unknown[] = [];
    server.use(
      http.get(`${REST}/importacoes`, () =>
        HttpResponse.json({
          arquivo_nome: 'Relatorio ficticio.pdf',
          criado_em: '2026-11-04T15:00:00Z',
          favorecido: {
            nome: 'Alice Fictícia Moura',
            periodo_inicio: '2026-10-01',
            periodo_fim: '2026-10-31',
          },
          analises: [
            { data: '2026-10-05', texto: 'Fez contato visual com dica verbal.', falta: false },
          ],
        }),
      ),
      http.get(`${REST}/leituras_de_nivel`, () => HttpResponse.json(lidas[0] ?? null)),
      http.post(`${env.SUPABASE_URL}/functions/v1/ler-niveis`, async ({ request }) => {
        pedidos.push(await request.json());
        lidas.push({ situacao: 'lida', dias: 1, metas: 1, lida_em: '2026-11-04T15:01:00Z' });
        return HttpResponse.json({ ok: true, situacao: 'lida' });
      }),
    );
    const { user } = abrir();

    expect(
      await screen.findByText('O nível de apoio das metas ainda não foi lido.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ler os níveis' }));

    expect(
      await screen.findByText('Nível de apoio lido: 1 dia com nível, em 1 meta.'),
    ).toBeInTheDocument();
    expect(pedidos).toEqual([{ evolucao_id: ID }]);
  });
});

describe('Lacunas da evolução mensal (E10)', () => {
  it('a lacuna aberta impede conferir, e "Não foi trabalhado" põe a frase no texto', async () => {
    lacunasNoBanco = [
      {
        programa: 'Programa fictício',
        situacao: 'aberta',
        metas: ['Meta fictícia'],
        ignorada_por: null,
        ignorada_em: null,
      },
    ];
    banco.versoes = [
      {
        numero: 2,
        conteudo: {
          abertura: '',
          programas: 'Texto fictício de teste. '.repeat(30).trim(),
          comportamentos: '',
          recursos: '',
          fechamento: '',
        },
        autor: 'ia',
        criado_em: '2026-11-04T15:00:00Z',
        criado_por: null,
      },
    ];
    const { user } = abrir();
    await screen.findByRole('heading', { level: 1 });
    expect(
      await parte('Evolução mensal').findByText('1 lacuna aberta', { exact: false }),
    ).toBeInTheDocument();
    expect(
      parte('Evolução mensal').getByRole('button', { name: 'Marcar como conferida' }),
    ).toBeDisabled();

    await user.click(parte('Evolução mensal').getByRole('button', { name: 'Não foi trabalhado' }));
    await vi.waitFor(() => {
      const versao = banco.versoes.find((v) => v.numero === 2);
      expect((versao?.conteudo as { programas: string }).programas).toMatch(
        /O programa Programa fictício não foi aplicado no período\.$/,
      );
    });
  });
});

describe('Fontes do rascunho (E06, E25)', () => {
  it('mostra de que sessões e documentos saiu cada frase, e avisa a frase sem fonte', async () => {
    const fonte = {
      numero: 2,
      campo: 'programas',
      versao_atual: true,
      criado_em: '2026-11-04T15:00:00Z',
    };
    fontesNoBanco = [
      {
        ...fonte,
        ordem: 0,
        frase: 'A assistida pareou figuras com dica verbal.',
        datas: ['2026-10-05'],
        documentos: [{ id: 3, tipo: 'escola', data: '2026-10-20', arquivo: 'escola.pdf' }],
      },
      { ...fonte, ordem: 1, frase: 'Frase fictícia sem base.', datas: [], documentos: [] },
    ];
    const { user } = abrir();
    await screen.findByRole('heading', { level: 1 });
    await user.click(await parte('Evolução mensal').findByText('Fontes do rascunho da IA (2)'));
    expect(parte('Evolução mensal').getByText('sessão de 05/10')).toBeVisible();
    expect(parte('Evolução mensal').getByText('Relatório escolar, 20/10/2026')).toBeVisible();
    expect(parte('Evolução mensal').getByText('sem fonte indicada')).toBeVisible();
    expect(parte('Metas alcançadas').queryByText(/Fontes do rascunho/)).not.toBeInTheDocument();
  });
});
