// Rascunho da evolução mensal pela IA (E05, E06). Chamada pelo coordenador, com o login dele.
//
// A função lê, com as permissões de quem chama (RLS), a evolução em conferência, a importação do
// Tita, os outros documentos ativos (E25) e as orientações ativas da coordenação geral (E22); tira o
// nome do assistido das análises do período e dos documentos (E05); pede o rascunho à API da OpenAI, com as orientações antes das análises; e grava as
// partes 2 a 4 como versões da IA. Nome, plano e CRP não vão para a IA, e nenhum texto de
// assistido vai para o log.
//
// Segredos (Edge Functions → Secrets): OPENAI_API_KEY e OPENAI_MODEL. A plataforma confere o JWT
// de quem chama antes de a função rodar (verify_jwt, o padrão).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

import { type Fonte, fontesDasFrases } from '../_shared/dominio/fontes.ts';
import { type Genero, tratamentoDe, trocarNome } from '../_shared/dominio/pseudonimo.ts';
import {
  type AnaliseDoPeriodo,
  type DocumentoDoPedido,
  lerOrientacoes,
  lerRespostaDaIA,
  montarPedido,
} from '../_shared/dominio/rascunho.ts';

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

/** O que a função precisa ler, com as permissões de quem chama: quem não lê recebe a recusa. */
async function lerComoUsuario(autorizacao: string, evolucaoId: string) {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const usuario = createClient(url, chave('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: autorizacao } },
  });
  const completa = await usuario.schema('evolucao').rpc('evolucao_completa', { p_id: evolucaoId });
  if (completa.error !== null)
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler a evolução.');
  if (completa.data === null || completa.data.editavel !== true) {
    throw new Recusa(403, 'sem_permissao', 'Só o coordenador da carteira gera o rascunho.');
  }
  if (completa.data.situacao !== 'em_conferencia') {
    throw new Recusa(
      409,
      'evolucao_fechada',
      'A evolução não está em conferência. Reabra antes de gerar.',
    );
  }

  const evolucao = await usuario
    .schema('evolucao')
    .from('evolucoes')
    .select('assistido_id, mes_ref, periodo_inicio, periodo_fim')
    .eq('id', evolucaoId)
    .single();
  const importacao = await usuario
    .schema('evolucao')
    .from('importacoes')
    .select('analises')
    .eq('evolucao_id', evolucaoId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (evolucao.error !== null || importacao.error !== null) {
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler a evolução.');
  }
  const assistido = await usuario
    .schema('cadastro')
    .from('assistidos')
    .select('nome, genero')
    .eq('id', evolucao.data.assistido_id)
    .single();
  if (assistido.error !== null)
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler o assistido.');

  const { periodo_inicio: inicio, periodo_fim: fim } = evolucao.data;
  const analises: AnaliseDoPeriodo[] = (
    (importacao.data?.analises ?? []) as AnaliseDoPeriodo[]
  ).filter((analise) => analise.data >= inicio && analise.data <= fim);
  if (analises.length === 0) {
    throw new Recusa(422, 'sem_importacao', 'Importe o PDF do Tita antes de gerar o rascunho.');
  }
  const documentos = await usuario
    .schema('evolucao')
    .from('documentos')
    .select('id, tipo, data_documento, texto')
    .eq('evolucao_id', evolucaoId)
    .eq('ativo', true)
    .order('id');
  if (documentos.error !== null) {
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler os outros documentos.');
  }
  // O plano terapêutico (E23): o ponto de partida das metas para o mês atual. A suspensa fica fora.
  const metas = await usuario
    .schema('cadastro')
    .from('metas')
    .select('texto, situacao')
    .eq('assistido_id', evolucao.data.assistido_id)
    .neq('situacao', 'suspensa')
    .order('id');
  if (metas.error !== null) {
    throw new Recusa(502, 'indisponivel', 'Não foi possível ler o cadastro de metas.');
  }
  // As orientações são reforço: se a leitura falhar, o rascunho sai sem elas, e o log diz por quê.
  const orientacoes = await usuario
    .schema('evolucao')
    .from('orientacoes_ia')
    .select('campo, texto')
    .eq('ativa', true)
    .order('id');
  if (orientacoes.error !== null) {
    console.error('gerar-rascunho: orientações não lidas', orientacoes.error.code);
  }
  return {
    url,
    orientacoes: lerOrientacoes(orientacoes.data),
    mesRef: evolucao.data.mes_ref as string,
    nome: assistido.data.nome as string,
    genero: assistido.data.genero as Genero,
    analises,
    documentos: documentos.data.map((d): DocumentoDoPedido => ({
      tipo: d.tipo,
      data: d.data_documento,
      texto: d.texto,
    })),
    idsDosDocumentos: documentos.data.map((d) => d.id as number),
    metas: metas.data as { texto: string; situacao: string }[],
  };
}

/** Pede o rascunho à OpenAI. Do erro, só o status vai para o log: nunca o texto. */
async function pedirRascunho(corpo: unknown) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (apiKey === undefined)
    throw new Recusa(500, 'sem_configuracao', 'Falta configurar a chave da IA.');
  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    console.error('gerar-rascunho: a IA respondeu', resposta.status);
    throw new Recusa(
      502,
      'ia_indisponivel',
      'A IA não respondeu agora. Tente de novo em instantes.',
    );
  }
  const rascunho = lerRespostaDaIA(await resposta.json());
  if (rascunho === null) {
    throw new Recusa(
      502,
      'ia_resposta_invalida',
      'A IA devolveu um rascunho fora do formato. Gere de novo.',
    );
  }
  return rascunho;
}

/** A parte de cada bloco: os 5 trechos são a parte 2; as listas de metas, as partes 3 e 4. */
const PARTE_DAS_METAS: Record<string, number> = { metas_alcancadas: 3, metas_do_mes: 4 };
const parteDoCampo = (campo: string) => PARTE_DAS_METAS[campo] ?? 2;

/**
 * As fontes de cada frase (E06), ligadas à versão da IA de cada parte. São um apoio à conferência:
 * se a gravação falhar, o rascunho fica, e o log diz por quê.
 */
async function gravarFontes(
  servico: ReturnType<typeof createClient>,
  versoes: readonly { id: number; numero: number }[],
  fontes: readonly Fonte[],
) {
  const linhas = fontes.flatMap((f) => {
    const versao = versoes.find((v) => v.numero === parteDoCampo(f.campo));
    return versao === undefined
      ? []
      : [
          {
            versao_id: versao.id,
            campo: f.campo,
            ordem: f.ordem,
            frase: f.frase,
            datas: f.datas,
            documentos: f.documentos,
          },
        ];
  });
  if (linhas.length === 0) return;
  const { error } = await servico.schema('evolucao').from('fontes').insert(linhas);
  if (error !== null) console.error('gerar-rascunho: fontes não gravadas', error.code);
}

async function gerar(pedido: Request): Promise<Response> {
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
  const analises = lido.analises.map((analise) => ({
    ...analise,
    texto: trocarNome(analise.texto, lido.nome, lido.genero).texto,
  }));
  // A orientação vale para todas as evoluções e não deve citar assistido; se citar o desta, o
  // nome sai aqui também.
  const orientacoes = lido.orientacoes.map((orientacao) => ({
    ...orientacao,
    texto: trocarNome(orientacao.texto, lido.nome, lido.genero).texto,
  }));
  // O texto do documento já foi gravado sem o nome; a troca de novo é a segunda trava (E05).
  const documentos = lido.documentos.map((documento) => ({
    ...documento,
    texto: trocarNome(documento.texto, lido.nome, lido.genero).texto,
  }));
  // A meta do plano não deve citar o assistido; se citar, o nome sai aqui (E05).
  const semNome = (texto: string) => trocarNome(texto, lido.nome, lido.genero).texto;
  const plano = {
    emDesenvolvimento: lido.metas
      .filter((m) => m.situacao === 'desenvolvimento')
      .map((m) => semNome(m.texto)),
    jaAlcancadas: lido.metas
      .filter((m) => m.situacao !== 'desenvolvimento')
      .map((m) => semNome(m.texto)),
  };
  const rascunho = await pedirRascunho(
    montarPedido(modelo, {
      mesRef: lido.mesRef,
      tratamento: tratamentoDe(lido.genero),
      analises,
      orientacoes,
      documentos,
      metas: plano,
    }),
  );

  // As versões da IA não têm autor humano: só a chave de serviço grava `autor = 'ia'`. Os triggers
  // continuam valendo (evolução em conferência e formato de cada parte).
  const servico = createClient(
    lido.url,
    chave('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
  );
  const gravacao = await servico
    .schema('evolucao')
    .from('versoes')
    .insert([
      { evolucao_id: evolucaoId, numero: 2, conteudo: rascunho.texto, autor: 'ia' },
      {
        evolucao_id: evolucaoId,
        numero: 3,
        conteudo: { metas: rascunho.metasAlcancadas },
        autor: 'ia',
      },
      { evolucao_id: evolucaoId, numero: 4, conteudo: { metas: rascunho.metasDoMes }, autor: 'ia' },
    ])
    .select('id, numero');
  if (gravacao.error !== null) {
    console.error('gerar-rascunho: falha ao gravar', gravacao.error.code);
    throw new Recusa(502, 'indisponivel', 'Não foi possível gravar o rascunho. Tente de novo.');
  }
  const fontes = fontesDasFrases(
    rascunho.frases,
    lido.analises.map((a) => a.data),
    lido.idsDosDocumentos,
  );
  await gravarFontes(servico, gravacao.data as { id: number; numero: number }[], fontes);
  return responder(200, { ok: true });
}

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (pedido.method !== 'POST')
    return responder(405, { codigo: 'pedido_invalido', mensagem: 'Use POST.' });
  try {
    return await gerar(pedido);
  } catch (erro) {
    if (erro instanceof Recusa)
      return responder(erro.status, { codigo: erro.codigo, mensagem: erro.message });
    console.error(
      'gerar-rascunho: erro inesperado',
      erro instanceof Error ? erro.name : 'desconhecido',
    );
    return responder(500, {
      codigo: 'indisponivel',
      mensagem: 'Não foi possível gerar o rascunho agora.',
    });
  }
});
