import type { Page } from '@playwright/test';

/**
 * Supabase fictício para o E2E: o build de teste aponta para `exemplo.supabase.co`, que não
 * existe. O Playwright responde no lugar dele o que as telas usam: Auth, `acesso.usuarios`, a RPC
 * das evoluções do mês e as unidades, os planos, as pessoas e as carteiras do cadastro. Nenhuma
 * senha, nome ou dado real:
 * tudo aqui é dos testes.
 */
const BASE = 'https://exemplo.supabase.co';
const AUTH_USER_ID = '11111111-1111-4111-8111-111111111111';
const SENHA_DEMO = 'senha-ficticia-de-teste';

export type Papel = 'coordenador' | 'coordenacao_geral' | 'contas_medicas';

const USUARIOS: Record<Papel, { id: number; nome: string; email: string }> = {
  coordenador: {
    id: 2,
    nome: 'Carla Fictícia Coordenadora',
    email: 'coordenacao.demo@evolucao-aba.test',
  },
  coordenacao_geral: {
    id: 1,
    nome: 'Gabriela Fictícia Geral',
    email: 'geral.demo@evolucao-aba.test',
  },
  contas_medicas: { id: 3, nome: 'Caio Fictício Contas', email: 'contas.demo@evolucao-aba.test' },
};

const base64url = (valor: object) => Buffer.from(JSON.stringify(valor)).toString('base64url');

const TOKEN = [
  base64url({ alg: 'HS256', typ: 'JWT' }),
  base64url({ sub: AUTH_USER_ID, role: 'authenticated', exp: 4_102_444_800 }),
  'assinatura-ficticia',
].join('.');

const usuarioDoAuth = (email: string) => ({
  id: AUTH_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  email_confirmed_at: '2026-11-01T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
});

type Situacao = 'em_conferencia' | 'concluida' | 'enviada' | null;

const linha = (
  id: number,
  nome: string,
  situacao: Situacao,
  extra: Record<string, unknown> = {},
) => {
  const sigla = (extra.unidade_sigla as string | undefined) ?? 'UNA';
  return {
    assistido_id: id,
    nome,
    plano: 'Plano Fictício',
    unidade_sigla: sigla,
    unidade_nome: 'Unidade Fictícia',
    turno: 'manha',
    coordenador_id: 2,
    evolucao_id:
      situacao === null ? null : `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    codigo: situacao === null ? null : `${sigla}-2611-${String(id).padStart(3, '0')}-EV`,
    situacao,
    origem: situacao === null ? null : 'tita',
    partes_conferidas: situacao === 'em_conferencia' ? 2 : 0,
    ...extra,
  };
};

const CARTEIRA = [
  linha(1, 'Alice Fictícia Moura', null),
  linha(2, 'Bento Fictício Prado', null, { plano: null }),
  linha(3, 'Cecília Fictícia Rios', 'em_conferencia'),
  linha(4, 'Davi Fictício Nunes', 'concluida'),
  linha(5, 'Elisa Fictícia Torres', 'enviada'),
];

const OUTRA_UNIDADE = [
  linha(6, 'Fábio Fictício Lopes', 'em_conferencia', {
    unidade_sigla: 'UNB',
    unidade_nome: 'Outra Unidade Fictícia',
    turno: 'tarde',
    coordenador_id: 7,
  }),
];

const COORDENADORES = [
  { id: 2, nome: USUARIOS.coordenador.nome },
  { id: 7, nome: 'Gil Fictício Coordenador' },
];

type LinhaDoCadastro = Record<string, unknown> & { id: number };

/** O que não se repete: um campo (a `unique` do banco) ou uma regra entre duas linhas. */
type Unicidade = string | ((existente: LinhaDoCadastro, nova: LinhaDoCadastro) => boolean);

const repete = (unico: Unicidade, existente: LinhaDoCadastro, nova: LinhaDoCadastro) =>
  typeof unico === 'function' ? unico(existente, nova) : existente[unico] === nova[unico];

const DUPLICADO = { status: 409, json: { code: '23505', message: 'duplicate key' } };

/** O índice único parcial das carteiras: uma ativa por unidade e turno. */
const mesmaVagaAtiva = (existente: LinhaDoCadastro, nova: LinhaDoCadastro) =>
  existente.ativa === true &&
  nova.ativa === true &&
  existente.unidade_id === nova.unidade_id &&
  existente.turno === nova.turno;

/**
 * Tabela do cadastro em memória, por teste: lista, cadastra e altera pelo `id`, recusando o que
 * repete (`unico`) como a constraint do banco. Só a coordenação geral escreve, como no RLS.
 */
async function simularTabela(
  page: Page,
  papel: Papel,
  {
    nome,
    linhas,
    unico,
    padrao = {},
  }: {
    nome: string;
    linhas: LinhaDoCadastro[];
    unico: Unicidade;
    padrao?: Record<string, unknown>;
  },
): Promise<void> {
  await page.route(`${BASE}/rest/v1/${nome}**`, async (rota) => {
    const pedido = rota.request();
    if (pedido.method() === 'GET') return rota.fulfill({ json: linhas });
    if (papel !== 'coordenacao_geral') {
      return rota.fulfill({ status: 403, json: { code: '42501', message: 'RLS' } });
    }
    const corpo = pedido.postDataJSON() as Record<string, unknown>;
    if (pedido.method() === 'POST') {
      const nova = { ...padrao, ...corpo, id: linhas.length + 1 };
      if (linhas.some((linha) => repete(unico, linha, nova))) return rota.fulfill(DUPLICADO);
      linhas.push(nova);
      return rota.fulfill({ status: 201, json: nova });
    }
    const id = Number(new URL(pedido.url()).searchParams.get('id')?.replace('eq.', ''));
    const indice = linhas.findIndex((linha) => linha.id === id);
    const alterada = { ...linhas[indice], ...corpo, id };
    if (linhas.some((linha) => linha.id !== id && repete(unico, linha, alterada))) {
      return rota.fulfill(DUPLICADO);
    }
    linhas[indice] = alterada;
    return rota.fulfill({ json: alterada });
  });
}

async function simularCadastros(page: Page, papel: Papel): Promise<void> {
  await simularTabela(page, papel, {
    nome: 'unidades',
    unico: 'sigla',
    linhas: [
      { id: 1, sigla: 'UNA', nome: 'Unidade Fictícia', ativa: true },
      { id: 2, sigla: 'UNB', nome: 'Outra Unidade Fictícia', ativa: true },
    ],
  });
  await simularTabela(page, papel, {
    nome: 'planos',
    unico: 'nome',
    linhas: [{ id: 1, nome: 'Plano Fictício', ativo: true }],
  });
  // As pessoas: as três contas dos testes e uma pessoa que ainda não entrou.
  await simularTabela(page, papel, {
    nome: 'usuarios',
    unico: 'email',
    padrao: { auth_user_id: null },
    linhas: [
      ...Object.entries(USUARIOS).map(([papelDaConta, conta]) => ({
        ...conta,
        papel: papelDaConta,
        crp: papelDaConta === 'coordenador' ? '06/12345' : null,
        ativo: true,
        auth_user_id: `0000000${String(conta.id)}-0000-4000-8000-000000000000`,
      })),
      {
        id: 4,
        nome: 'Bruno Fictício Novo',
        email: 'novo.demo@evolucao-aba.test',
        papel: 'coordenador',
        crp: null,
        ativo: true,
        auth_user_id: null,
      },
    ],
  });
  // As carteiras: a manhã da UNA com a Carla e a tarde da UNB com o Bruno.
  await simularTabela(page, papel, {
    nome: 'carteiras',
    unico: mesmaVagaAtiva,
    padrao: { ativa: true },
    linhas: [
      { id: 1, unidade_id: 1, turno: 'manha', coordenador_id: 2, ativa: true },
      { id: 2, unidade_id: 2, turno: 'tarde', coordenador_id: 4, ativa: true },
    ],
  });
}

async function simularSupabase(page: Page, papel: Papel): Promise<void> {
  await simularCadastros(page, papel);
  const { email, ...usuario } = USUARIOS[papel];
  await page.route(`${BASE}/auth/v1/token**`, async (rota) => {
    const corpo = rota.request().postDataJSON() as { email?: string; password?: string };
    if (corpo.email !== email || corpo.password !== SENHA_DEMO) {
      await rota.fulfill({
        status: 400,
        json: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
      });
      return;
    }
    await rota.fulfill({
      json: {
        access_token: TOKEN,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-ficticio',
        user: usuarioDoAuth(email),
      },
    });
  });
  await page.route(`${BASE}/auth/v1/user`, (rota) => rota.fulfill({ json: usuarioDoAuth(email) }));
  await page.route(`${BASE}/auth/v1/logout**`, (rota) => rota.fulfill({ status: 204 }));
  // Registrada depois da tabela de pessoas, responde antes dela: a conta da sessão e o filtro de
  // coordenadores. A lista inteira e as escritas seguem para a tabela (`fallback`).
  await page.route(`${BASE}/rest/v1/usuarios**`, (rota) => {
    const url = rota.request().url();
    if (url.includes('papel=eq.coordenador')) return rota.fulfill({ json: COORDENADORES });
    if (url.includes('auth_user_id=eq.')) {
      return rota.fulfill({ json: [{ ...usuario, email, papel, ativo: true }] });
    }
    return rota.fallback();
  });
  // A RPC respeita o papel como o RLS faria: o coordenador vê só a carteira dele.
  await page.route(`${BASE}/rest/v1/rpc/evolucoes_do_mes`, (rota) =>
    rota.fulfill({
      json: papel === 'coordenacao_geral' ? [...CARTEIRA, ...OUTRA_UNIDADE] : CARTEIRA,
    }),
  );
}

/**
 * Entra pela tela de login com a conta fictícia do papel. O relógio fica em 04/11/2026 em Recife:
 * mês aberto novembro, prazo do arquivo em 6 dias.
 */
export async function entrar(page: Page, papel: Papel = 'coordenador'): Promise<void> {
  await page.clock.setFixedTime(new Date('2026-11-04T15:00:00Z'));
  await simularSupabase(page, papel);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(USUARIOS[papel].email);
  await page.getByLabel('Senha').fill(SENHA_DEMO);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // Sem esperar a sessão, um `goto` logo depois às vezes volta para o login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
