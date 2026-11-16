// Sincronização do cadastro de assistidos com a Tita (E28).
//
// Quem chama: a coordenação geral, pela tela (com o login dela), ou o agendamento do pg_cron, com
// o cabeçalho `x-agendamento` (o token fica no Vault, segredo `tita_agendamento`). A função busca a
// lista de favorecidos na API da Tita, fica só com id, nome, sexo, nascimento, ativo e unidades, e
// entrega tudo a `cadastro.sincronizar_tita`, que casa, cria os rascunhos e grava as pendências.
// Com `{ "simular": true }`, devolve os números sem gravar nada.
//
// Segredos (Edge Functions → Secrets): TITA_TOKEN e, se a Tita mudar de endereço, TITA_ENDPOINT.
// Nenhum nome, CPF ou telefone vai para o log.
//
// `verify_jwt = false` no config.toml: o agendamento não tem login. A função confere quem chama
// antes de qualquer coisa.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { FormatoDaTita, lerFavorecidos, urlDaTita } from '../_shared/dominio/tita.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** A Tita costuma responder em menos de 1 s; depois disso, desiste e tenta na próxima rodada. */
const ESPERA_DA_TITA_MS = 25_000;

/** A recusa com um código estável, que a tela traduz, e a mensagem já em português. */
class Recusa extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** A chave nova (dicionário em JSON, nome `default`) ou, se o projeto ainda não a tem, a antiga. */
function chave(novas: string, antiga: string): string {
  const dicionario = Deno.env.get(novas);
  const valor = dicionario === undefined ? undefined : JSON.parse(dicionario).default;
  const escolhida = typeof valor === 'string' ? valor : Deno.env.get(antiga);
  if (escolhida === undefined)
    throw new Recusa(500, 'sem_configuracao', 'A função está sem as chaves do Supabase.');
  return escolhida;
}

interface Pedido {
  origem: 'manual' | 'agendada';
  pedidaPor: number | null;
}

/** Quem chama: o agendamento (token do Vault) ou alguém da coordenação geral (login). */
async function conferirQuemPede(pedido: Request, servico: SupabaseClient): Promise<Pedido> {
  const token = pedido.headers.get('x-agendamento');
  if (token !== null) {
    const conferido = await servico
      .schema('cadastro')
      .rpc('conferir_agendamento_da_tita', { p_token: token });
    if (conferido.error !== null) {
      console.error('sincronizar-tita: conferir agendamento', conferido.error.code);
      throw new Recusa(500, 'indisponivel', 'Não foi possível conferir o agendamento.');
    }
    if (conferido.data !== true) {
      throw new Recusa(401, 'sem_permissao', 'Agendamento não reconhecido.');
    }
    return { origem: 'agendada', pedidaPor: null };
  }

  const autorizacao = pedido.headers.get('Authorization');
  if (autorizacao === null || !autorizacao.startsWith('Bearer ')) {
    throw new Recusa(401, 'sem_permissao', 'Entre no sistema para sincronizar.');
  }
  const usuario = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    chave('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: autorizacao } } },
  );
  // A Data API confere o JWT: login vencido ou falso volta como erro.
  const quem = await usuario.schema('cadastro').rpc('quem_sincroniza_a_tita');
  if (quem.error !== null)
    throw new Recusa(401, 'sem_permissao', 'Entre no sistema para sincronizar.');
  if (typeof quem.data !== 'number') {
    throw new Recusa(403, 'sem_permissao', 'Só a coordenação geral sincroniza com a Tita.');
  }
  return { origem: 'manual', pedidaPor: quem.data };
}

/** Busca a lista na Tita. A falha volta como texto curto, sem dado de criança. */
async function buscarNaTita(): Promise<unknown> {
  const token = Deno.env.get('TITA_TOKEN');
  if (token === undefined || token.trim() === '') {
    throw new Recusa(500, 'sem_configuracao', 'Falta configurar o token da Tita (TITA_TOKEN).');
  }
  let resposta: Response;
  try {
    resposta = await fetch(urlDaTita(Deno.env.get('TITA_ENDPOINT')), {
      headers: { 'X-API-TOKEN': token.trim(), Accept: 'application/json' },
      signal: AbortSignal.timeout(ESPERA_DA_TITA_MS),
    });
  } catch (erro) {
    const tempo = erro instanceof DOMException && erro.name === 'TimeoutError';
    throw new Recusa(
      502,
      'tita_indisponivel',
      tempo ? 'A Tita não respondeu em 25 segundos.' : 'Não foi possível falar com a Tita.',
    );
  }
  if (resposta.status === 401 || resposta.status === 403) {
    throw new Recusa(502, 'tita_recusou', 'A Tita recusou o token (TITA_TOKEN).');
  }
  if (!resposta.ok) {
    throw new Recusa(502, 'tita_indisponivel', `A Tita respondeu ${String(resposta.status)}.`);
  }
  return await resposta.json().catch(() => null);
}

async function sincronizar(pedido: Request): Promise<Response> {
  const corpo: unknown = await pedido.json().catch(() => null);
  const simular =
    typeof corpo === 'object' &&
    corpo !== null &&
    (corpo as { simular?: unknown }).simular === true;
  const servico = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    chave('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
  );
  const { origem, pedidaPor } = await conferirQuemPede(pedido, servico);

  // A falha fica no histórico (a simulação não grava nada).
  const registrarFalha = async (recusa: Recusa) => {
    if (simular) return;
    const gravada = await servico.schema('cadastro').rpc('registrar_falha_da_tita', {
      p_origem: origem,
      p_pedida_por: pedidaPor,
      p_erro: recusa.message,
    });
    if (gravada.error !== null) {
      console.error('sincronizar-tita: falha ao registrar a falha', gravada.error.code);
    }
  };

  let lista;
  try {
    lista = lerFavorecidos(await buscarNaTita());
    if (lista.favorecidos.length === 0) {
      throw new Recusa(502, 'tita_vazia', 'A Tita devolveu a lista vazia; nada foi mudado.');
    }
  } catch (erro) {
    const recusa =
      erro instanceof Recusa
        ? erro
        : erro instanceof FormatoDaTita
          ? new Recusa(502, 'tita_formato', erro.message)
          : new Recusa(502, 'tita_indisponivel', 'Não foi possível ler a resposta da Tita.');
    console.error('sincronizar-tita:', recusa.codigo);
    await registrarFalha(recusa);
    throw recusa;
  }

  const resultado = await servico.schema('cadastro').rpc('sincronizar_tita', {
    p_favorecidos: lista.favorecidos,
    p_origem: origem,
    p_pedida_por: pedidaPor,
    p_simular: simular,
    p_sem_id: lista.semId,
  });
  if (resultado.error !== null) {
    console.error('sincronizar-tita: o banco recusou', resultado.error.code);
    const recusa = new Recusa(502, 'indisponivel', 'O banco não aceitou a sincronização.');
    await registrarFalha(recusa);
    throw recusa;
  }
  return responder(200, resultado.data);
}

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (pedido.method !== 'POST')
    return responder(405, { codigo: 'pedido_invalido', mensagem: 'Use POST.' });
  try {
    return await sincronizar(pedido);
  } catch (erro) {
    if (erro instanceof Recusa)
      return responder(erro.status, { codigo: erro.codigo, mensagem: erro.message });
    console.error(
      'sincronizar-tita: erro inesperado',
      erro instanceof Error ? erro.name : 'desconhecido',
    );
    return responder(500, {
      codigo: 'indisponivel',
      mensagem: 'Não foi possível sincronizar agora.',
    });
  }
});
