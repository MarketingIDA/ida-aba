// Leitura do nível de apoio pela IA (E05, E27). Chamada pelo coordenador, com o login dele, logo
// depois de importar o PDF do Tita.
//
// A função lê, com as permissões de quem chama (RLS), a importação atual da evolução e as metas do
// assistido que têm programa (menos as suspensas); tira o nome do assistido das análises e das
// metas (E05); pede à IA os níveis de cada meta em cada sessão do período; confere a resposta no
// domínio puro (o nível de mais apoio, o trecho que tem de estar na análise e um ponto por dia); e
// grava pela RPC `evolucao.gravar_niveis`, que só o servidor executa. Nome, plano e CRP não vão
// para a IA, e nenhum texto de assistido vai para o log.
//
// Segredos (Edge Functions → Secrets): OPENAI_API_KEY e OPENAI_MODEL, os mesmos do rascunho.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import {
  lerRespostaDosNiveis,
  type MetaDoPedido,
  montarPedidoDosNiveis,
  type SessaoDoPedido,
} from '../_shared/dominio/niveis.ts';
import { type Genero, trocarNome } from '../_shared/dominio/pseudonimo.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

interface Lido {
  url: string;
  importacaoId: number;
  nome: string;
  genero: Genero;
  sessoes: SessaoDoPedido[];
  metas: MetaDoPedido[];
}

/** As análises do período que não são falta, na ordem do PDF. */
function sessoesDoPeriodo(analises: unknown, inicio: string, fim: string): SessaoDoPedido[] {
  const lista = (Array.isArray(analises) ? analises : []) as {
    data: string;
    texto: string;
    falta: boolean;
  }[];
  return lista
    .filter((a) => !a.falta && a.data >= inicio && a.data <= fim)
    .map((a) => ({ data: a.data, texto: a.texto }));
}

async function lerEvolucao(usuario: SupabaseClient, evolucaoId: string) {
  const completa = await usuario.schema('evolucao').rpc('evolucao_completa', { p_id: evolucaoId });
  if (completa.error !== null)
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler a evolução.');
  if (completa.data === null || completa.data.editavel !== true) {
    throw new Recusa(403, 'sem_permissao', 'Só o coordenador da carteira lê os níveis de apoio.');
  }
  // A leitura não muda o texto da evolução: vale também na concluída e na enviada, para a meta que
  // entrou no cadastro depois (o gráfico não pode depender de reabrir a evolução).
  const evolucao = await usuario
    .schema('evolucao')
    .from('evolucoes')
    .select('assistido_id, periodo_inicio, periodo_fim')
    .eq('id', evolucaoId)
    .single();
  if (evolucao.error !== null)
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler a evolução.');
  return evolucao.data;
}

/** O que a função precisa ler, com as permissões de quem chama: quem não lê recebe a recusa. */
async function lerComoUsuario(autorizacao: string, evolucaoId: string): Promise<Lido> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const usuario = createClient(url, chave('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: autorizacao } },
  });
  const evolucao = await lerEvolucao(usuario, evolucaoId);
  const [importacao, assistido, metas] = await Promise.all([
    usuario
      .schema('evolucao')
      .from('importacoes')
      .select('id, analises')
      .eq('evolucao_id', evolucaoId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
    usuario
      .schema('cadastro')
      .from('assistidos')
      .select('nome, genero')
      .eq('id', evolucao.assistido_id)
      .single(),
    usuario
      .schema('cadastro')
      .from('metas')
      .select('id, programa, texto')
      .eq('assistido_id', evolucao.assistido_id)
      .not('programa', 'is', null)
      .neq('situacao', 'suspensa')
      .order('id'),
  ]);
  if (importacao.error !== null || assistido.error !== null || metas.error !== null) {
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler a evolução.');
  }
  if (importacao.data === null) {
    throw new Recusa(422, 'sem_importacao', 'Importe o PDF do Tita antes de ler os níveis.');
  }
  return {
    url,
    importacaoId: importacao.data.id as number,
    nome: assistido.data.nome as string,
    genero: assistido.data.genero as Genero,
    sessoes: sessoesDoPeriodo(
      importacao.data.analises,
      evolucao.periodo_inicio as string,
      evolucao.periodo_fim as string,
    ),
    metas: metas.data as MetaDoPedido[],
  };
}

/** Pede os níveis à OpenAI. Do erro, só o status vai para o log: nunca o texto. */
async function pedirNiveis(corpo: unknown): Promise<unknown> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (apiKey === undefined)
    throw new Recusa(500, 'sem_configuracao', 'Falta configurar a chave da IA.');
  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    console.error('ler-niveis: a IA respondeu', resposta.status);
    throw new Recusa(
      502,
      'ia_indisponivel',
      'A IA não respondeu agora. Tente de novo em instantes.',
    );
  }
  return resposta.json();
}

/** Grava a leitura pela RPC do servidor; a importação que já não é a atual é ignorada. */
async function gravar(
  servico: SupabaseClient,
  importacaoId: number,
  situacao: 'lida' | 'sem_metas' | 'falhou',
  niveis: unknown[],
): Promise<void> {
  const { error } = await servico.schema('evolucao').rpc('gravar_niveis', {
    p_importacao_id: importacaoId,
    p_situacao: situacao,
    p_niveis: niveis,
  });
  if (error === null || error.hint === 'leitura_desatualizada') return;
  console.error('ler-niveis: falha ao gravar', error.code);
  throw new Recusa(502, 'indisponivel', 'Não foi possível gravar os níveis. Tente de novo.');
}

async function ler(pedido: Request): Promise<Response> {
  const autorizacao = pedido.headers.get('Authorization');
  const corpo: unknown = await pedido.json().catch(() => null);
  const evolucaoId =
    typeof corpo === 'object' && corpo !== null
      ? (corpo as { evolucao_id?: unknown }).evolucao_id
      : null;
  if (autorizacao === null || typeof evolucaoId !== 'string' || !UUID.test(evolucaoId)) {
    throw new Recusa(400, 'pedido_invalido', 'Pedido inválido.');
  }
  const modelo = Deno.env.get('OPENAI_MODEL');
  if (modelo === undefined)
    throw new Recusa(500, 'sem_configuracao', 'Falta configurar o modelo da IA.');

  const lido = await lerComoUsuario(autorizacao, evolucaoId);
  const servico = createClient(
    lido.url,
    chave('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
  );
  if (lido.metas.length === 0 || lido.sessoes.length === 0) {
    await gravar(servico, lido.importacaoId, 'sem_metas', []);
    return responder(200, { ok: true, situacao: 'sem_metas' });
  }
  const semNome = (texto: string) => trocarNome(texto, lido.nome, lido.genero).texto;
  const sessoes = lido.sessoes.map((s) => ({ ...s, texto: semNome(s.texto) }));
  const metas = lido.metas.map((m) => ({
    ...m,
    programa: semNome(m.programa),
    texto: semNome(m.texto),
  }));

  // A IA fora do ar também fica registrada como `falhou`, para a tela oferecer "Ler de novo".
  const pontos = await pedirNiveis(montarPedidoDosNiveis(modelo, metas, sessoes))
    .then((resposta) => lerRespostaDosNiveis(resposta, metas, sessoes))
    .catch(async (erro: unknown) => {
      await gravar(servico, lido.importacaoId, 'falhou', []);
      throw erro;
    });
  if (pontos === null) {
    await gravar(servico, lido.importacaoId, 'falhou', []);
    throw new Recusa(
      502,
      'ia_resposta_invalida',
      'A IA devolveu os níveis fora do formato. Leia de novo.',
    );
  }
  await gravar(
    servico,
    lido.importacaoId,
    'lida',
    pontos.map((p) => ({ meta_id: p.metaId, data: p.data, nivel: p.nivel, trecho: p.trecho })),
  );
  return responder(200, { ok: true, situacao: 'lida' });
}

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (pedido.method !== 'POST')
    return responder(405, { codigo: 'pedido_invalido', mensagem: 'Use POST.' });
  try {
    return await ler(pedido);
  } catch (erro) {
    if (erro instanceof Recusa)
      return responder(erro.status, { codigo: erro.codigo, mensagem: erro.message });
    console.error(
      'ler-niveis: erro inesperado',
      erro instanceof Error ? erro.name : 'desconhecido',
    );
    return responder(500, {
      codigo: 'indisponivel',
      mensagem: 'Não foi possível ler os níveis agora.',
    });
  }
});
