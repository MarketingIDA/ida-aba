// "Aprimorar com a IA" na evolução escrita à mão (E26). Chamada pelo coordenador, com o login dele.
//
// A função lê, com as permissões de quem chama (RLS), a evolução manual em conferência, a versão
// atual da parte 2, os programas do plano, os termos inadequados e as orientações ativas (E22);
// tira o nome do assistido do texto e das orientações (E05); pede à OpenAI o texto com linguagem
// melhor, sem fato novo; confere a resposta trecho por trecho contra o original; e grava a parte 2
// como versão da IA, se mudou. O texto do coordenador fica como a versão anterior (E07). As metas
// (partes 3 e 4) não vão: o texto delas é o do cadastro (E12, E23). Nenhum texto vai para o log.
//
// Segredos (Edge Functions → Secrets): OPENAI_API_KEY e OPENAI_MODEL, os mesmos do rascunho.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

import { cabecalhoDaAuditoria } from '../_shared/dominio/autorDoPedido.ts';
import {
  conferirAprimoramento,
  INSTRUCAO_DO_APRIMORAMENTO,
  montarAprimoramento,
  type TermoDaLista,
} from '../_shared/dominio/aprimoramento.ts';
import { TRECHOS, TRECHOS_VAZIOS, type Trechos } from '../_shared/dominio/evolucao.ts';
import { type Genero, tratamentoDe, trocarNome } from '../_shared/dominio/pseudonimo.ts';
import { lerOrientacoes } from '../_shared/dominio/rascunho.ts';

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

const INDISPONIVEL = 'Não foi possível ler a evolução.';

/** A evolução manual em conferência, do coordenador da carteira, e o texto atual da parte 2. */
async function lerEvolucao(usuario: ReturnType<typeof createClient>, evolucaoId: string) {
  const completa = await usuario.schema('evolucao').rpc('evolucao_completa', { p_id: evolucaoId });
  if (completa.error !== null) throw new Recusa(502, 'indisponivel', INDISPONIVEL);
  const dados = completa.data as Record<string, unknown> | null;
  if (dados === null || dados.editavel !== true) {
    throw new Recusa(403, 'sem_permissao', 'Só o coordenador da carteira aprimora o texto.');
  }
  if (dados.situacao !== 'em_conferencia') {
    throw new Recusa(409, 'evolucao_fechada', 'A evolução não está em conferência.');
  }
  if (dados.origem !== 'manual') {
    throw new Recusa(
      409,
      'evolucao_do_tita',
      'Esta evolução tem o PDF do Tita: use o rascunho da IA.',
    );
  }
  const versoes = (dados.versoes ?? []) as { numero: number; conteudo: Partial<Trechos> }[];
  const atual = versoes.find((v) => v.numero === 2)?.conteudo ?? {};
  const trechos: Trechos = { ...TRECHOS_VAZIOS };
  for (const t of TRECHOS) trechos[t] = typeof atual[t] === 'string' ? atual[t] : '';
  if (TRECHOS.every((t) => trechos[t].trim() === '')) {
    throw new Recusa(422, 'sem_texto', 'Escreva o texto da evolução antes de aprimorar.');
  }
  return { assistidoId: dados.assistido_id as number, trechos };
}

/** O que a função precisa ler, com as permissões de quem chama: quem não lê recebe a recusa. */
async function lerComoUsuario(autorizacao: string, evolucaoId: string) {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const usuario = createClient(url, chave('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: autorizacao } },
  });
  const { assistidoId, trechos } = await lerEvolucao(usuario, evolucaoId);
  const assistido = await usuario
    .schema('cadastro')
    .from('assistidos')
    .select('nome, genero')
    .eq('id', assistidoId)
    .single();
  const metas = await usuario
    .schema('cadastro')
    .from('metas')
    .select('programa')
    .eq('assistido_id', assistidoId)
    .eq('situacao', 'desenvolvimento');
  if (assistido.error !== null || metas.error !== null) {
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler o cadastro do assistido.');
  }
  // Os termos e as orientações são reforço: se a leitura falhar, o pedido sai sem eles.
  const termos = await usuario
    .schema('cadastro')
    .from('termos_inadequados')
    .select('termo, substituto')
    .eq('ativo', true);
  const orientacoes = await usuario
    .schema('evolucao')
    .from('orientacoes_ia')
    .select('campo, texto')
    .eq('ativa', true)
    .order('id');
  if (termos.error !== null || orientacoes.error !== null) {
    console.error('aprimorar-texto: termos ou orientações não lidos');
  }
  const programas = (metas.data as { programa: string | null }[])
    .map((m) => m.programa?.trim() ?? '')
    .filter((p) => p !== '');
  return {
    url,
    trechos,
    nome: assistido.data.nome as string,
    genero: assistido.data.genero as Genero,
    programas: [...new Set(programas)],
    termos: (termos.data ?? []) as TermoDaLista[],
    orientacoes: lerOrientacoes(orientacoes.data),
  };
}

/** Pede o texto aprimorado à OpenAI. Do erro, só o status vai para o log: nunca o texto. */
async function pedirAprimoramento(corpo: unknown): Promise<unknown> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (apiKey === undefined)
    throw new Recusa(500, 'sem_configuracao', 'Falta configurar a chave da IA.');
  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    console.error('aprimorar-texto: a IA respondeu', resposta.status);
    throw new Recusa(
      502,
      'ia_indisponivel',
      'A IA não respondeu agora. Tente de novo em instantes.',
    );
  }
  return await resposta.json();
}

async function aprimorar(pedido: Request): Promise<Response> {
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
  const semNome = (texto: string) => trocarNome(texto, lido.nome, lido.genero).texto;
  const trechos: Trechos = { ...TRECHOS_VAZIOS };
  for (const t of TRECHOS) trechos[t] = semNome(lido.trechos[t]);
  const resposta = await pedirAprimoramento(
    montarAprimoramento(modelo, {
      tratamento: tratamentoDe(lido.genero),
      trechos,
      programas: lido.programas.map(semNome),
      termos: lido.termos,
      orientacoes: lido.orientacoes.map((o) => ({ ...o, texto: semNome(o.texto) })),
    }),
  );
  // A conferência é contra o texto que foi para a IA, já sem o nome.
  const aprimorado = conferirAprimoramento(trechos, resposta);
  if (aprimorado === null) {
    throw new Recusa(
      502,
      'ia_resposta_invalida',
      'A IA devolveu o texto fora do formato. Tente de novo.',
    );
  }
  if (TRECHOS.every((t) => aprimorado[t] === trechos[t].trim())) {
    return responder(200, { ok: true, mudou: false });
  }
  // O trecho que a IA não mudou fica como o coordenador escreveu, e não com o nome trocado.
  for (const t of TRECHOS) {
    if (aprimorado[t] === trechos[t].trim()) aprimorado[t] = lido.trechos[t].trim();
  }
  // A versão da IA não tem autor humano: só a chave de serviço grava `autor = 'ia'`. Os triggers
  // continuam valendo (evolução em conferência, formato da parte e volta para "a conferir").
  // Quem pediu vai no cabeçalho, para a auditoria registrar a pessoa e não o sistema.
  const servico = createClient(
    lido.url,
    chave('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
    { global: { headers: cabecalhoDaAuditoria(autorizacao) } },
  );
  const { error } = await servico.schema('evolucao').from('versoes').insert({
    evolucao_id: evolucaoId,
    numero: 2,
    conteudo: aprimorado,
    autor: 'ia',
    instrucao: INSTRUCAO_DO_APRIMORAMENTO,
  });
  if (error !== null) {
    console.error('aprimorar-texto: falha ao gravar', error.code);
    throw new Recusa(502, 'indisponivel', 'Não foi possível gravar o texto. Tente de novo.');
  }
  return responder(200, { ok: true, mudou: true });
}

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (pedido.method !== 'POST')
    return responder(405, { codigo: 'pedido_invalido', mensagem: 'Use POST.' });
  try {
    return await aprimorar(pedido);
  } catch (erro) {
    if (erro instanceof Recusa)
      return responder(erro.status, { codigo: erro.codigo, mensagem: erro.message });
    console.error(
      'aprimorar-texto: erro inesperado',
      erro instanceof Error ? erro.name : 'desconhecido',
    );
    return responder(500, {
      codigo: 'indisponivel',
      mensagem: 'Não foi possível aprimorar o texto agora.',
    });
  }
});
