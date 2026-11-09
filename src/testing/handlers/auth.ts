import { http, HttpResponse } from 'msw';

import { env } from '@/config/env';
import { AUTH_USER_ID_DEMO, SENHA_DEMO, usuarioDemo } from '@/testing/factories/usuario';

/**
 * Supabase Auth (GoTrue) fictício: só a conta demo entra, e só com a senha dos testes.
 * O token é um JWT de brincadeira, com a forma certa para o supabase-js guardar a sessão.
 */
const base64url = (valor: object) => Buffer.from(JSON.stringify(valor)).toString('base64url');

const TOKEN_DEMO = [
  base64url({ alg: 'HS256', typ: 'JWT' }),
  base64url({ sub: AUTH_USER_ID_DEMO, role: 'authenticated', exp: 4_102_444_800 }),
  'assinatura-ficticia',
].join('.');

const usuarioDoAuth = () => ({
  id: AUTH_USER_ID_DEMO,
  aud: 'authenticated',
  role: 'authenticated',
  email: usuarioDemo().email,
  email_confirmed_at: '2026-11-07T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-11-07T00:00:00Z',
  updated_at: '2026-11-07T00:00:00Z',
});

/** O que o supabase-js grava no armazenamento ao entrar (serve para simular sessão salva). */
export function sessaoDemo() {
  return {
    access_token: TOKEN_DEMO,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'refresh-ficticio',
    user: usuarioDoAuth(),
  };
}

export const CHAVE_DA_SESSAO = `sb-${new URL(env.SUPABASE_URL).hostname.split('.')[0] ?? ''}-auth-token`;

const credenciaisInvalidas = () =>
  HttpResponse.json(
    {
      code: 400,
      error_code: 'invalid_credentials',
      msg: 'Invalid login credentials',
    },
    { status: 400 },
  );

export const handlersDeAuth = [
  http.post(`${env.SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('grant_type') !== 'password') return credenciaisInvalidas();
    const corpo = (await request.json()) as { email?: string; password?: string };
    if (corpo.email !== usuarioDemo().email || corpo.password !== SENHA_DEMO) {
      return credenciaisInvalidas();
    }
    return HttpResponse.json(sessaoDemo());
  }),

  http.get(`${env.SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    if (request.headers.get('authorization') !== `Bearer ${TOKEN_DEMO}`) {
      return HttpResponse.json({ code: 401, msg: 'invalid JWT' }, { status: 401 });
    }
    return HttpResponse.json(usuarioDoAuth());
  }),

  // Senha nova do primeiro acesso (só com a sessão demo).
  http.put(`${env.SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    if (request.headers.get('authorization') !== `Bearer ${TOKEN_DEMO}`) {
      return HttpResponse.json({ code: 401, msg: 'invalid JWT' }, { status: 401 });
    }
    return HttpResponse.json(usuarioDoAuth());
  }),

  http.post(`${env.SUPABASE_URL}/auth/v1/logout`, () => new HttpResponse(null, { status: 204 })),
];
