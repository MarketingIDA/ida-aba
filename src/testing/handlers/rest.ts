import { http, HttpResponse } from 'msw';

import { env } from '@/config/env';
import {
  assistidosDemo,
  carteirasDemo,
  pessoasDemo,
  planosDemo,
  unidadesDoCadastroDemo,
} from '@/testing/factories/cadastros';
import {
  carteiraDemo,
  coordenadoresDemo,
  linhaDaRpc,
  MES_DEMO,
} from '@/testing/factories/evolucoes';
import { AUTH_USER_ID_DEMO, usuarioDemo } from '@/testing/factories/usuario';

const schemaErrado = () =>
  HttpResponse.json({ code: 'PGRST106', message: 'Invalid schema' }, { status: 406 });

/**
 * Data API (PostgREST) fictícia. O schema vem no cabeçalho (`Accept-Profile` na leitura,
 * `Content-Profile` no POST da RPC); schema errado responde o erro que a Data API daria.
 */
export const handlersDeRest = [
  http.get(`${env.SUPABASE_URL}/rest/v1/usuarios`, ({ request }) => {
    if (request.headers.get('accept-profile') !== 'acesso') return schemaErrado();
    const url = new URL(request.url);
    if (url.searchParams.get('papel') === 'eq.coordenador') {
      return HttpResponse.json(coordenadoresDemo());
    }
    const conta = url.searchParams.get('auth_user_id');
    // Sem filtro: a lista de pessoas da coordenação geral.
    if (conta === null) return HttpResponse.json(pessoasDemo());
    return HttpResponse.json(conta === `eq.${AUTH_USER_ID_DEMO}` ? [usuarioDemo()] : []);
  }),

  http.get(`${env.SUPABASE_URL}/rest/v1/unidades`, ({ request }) =>
    request.headers.get('accept-profile') === 'cadastro'
      ? HttpResponse.json(unidadesDoCadastroDemo())
      : schemaErrado(),
  ),

  http.get(`${env.SUPABASE_URL}/rest/v1/planos`, ({ request }) =>
    request.headers.get('accept-profile') === 'cadastro'
      ? HttpResponse.json(planosDemo())
      : schemaErrado(),
  ),

  http.get(`${env.SUPABASE_URL}/rest/v1/carteiras`, ({ request }) =>
    request.headers.get('accept-profile') === 'cadastro'
      ? HttpResponse.json(carteirasDemo())
      : schemaErrado(),
  ),

  http.get(`${env.SUPABASE_URL}/rest/v1/assistidos`, ({ request }) =>
    request.headers.get('accept-profile') === 'cadastro'
      ? HttpResponse.json(assistidosDemo())
      : schemaErrado(),
  ),

  // A carteira do coordenador demo tem evoluções só no mês dos testes.
  http.post(`${env.SUPABASE_URL}/rest/v1/rpc/evolucoes_do_mes`, async ({ request }) => {
    if (request.headers.get('content-profile') !== 'evolucao') return schemaErrado();
    const corpo = (await request.json()) as { p_mes?: string };
    return HttpResponse.json(corpo.p_mes === MES_DEMO ? carteiraDemo().map(linhaDaRpc) : []);
  }),
];
