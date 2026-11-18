import {
  MAXIMO_DA_META,
  MAXIMO_DE_METAS,
  MAXIMO_DO_TRECHO,
  TRECHOS,
  TRECHOS_VAZIOS,
  type Trechos,
} from './evolucao.ts';
import { situacaoDaData, TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from './documentos.ts';
import { formatarData, formatarMesLongo, periodoAnalisado } from './mes.ts';

/**
 * O rascunho da evolução mensal pela IA (E06): o que a IA recebe e como a resposta é lida. A IA
 * recebe as análises do período e os outros documentos (E25), já sem o nome do assistido (E05),
 * e devolve os 5 trechos do texto e as duas listas de metas. O que não tem base não é inventado.
 *
 * Domínio puro: a Edge Function só junta as peças e fala com a rede.
 */
export interface AnaliseDoPeriodo {
  /** `AAAA-MM-DD` */
  data: string;
  texto: string;
  falta: boolean;
}

/** Os blocos que a IA escreve: os 5 trechos do texto e as duas listas de metas. */
export const CAMPOS_DA_IA = [...TRECHOS, 'metas_alcancadas', 'metas_do_mes'] as const;

export type CampoDaIA = (typeof CAMPOS_DA_IA)[number];

/** Uma dica aprovada na curadoria (E22): vale para um campo, em todas as evoluções. */
export interface Orientacao {
  campo: CampoDaIA;
  texto: string;
}

/** Um outro documento da evolução (E25): o tipo, a data e o texto já sem o nome. Sem o arquivo. */
export interface DocumentoDoPedido {
  tipo: TipoDeDocumento;
  /** `AAAA-MM-DD`, ou `null` se o documento não tem data. */
  data: string | null;
  texto: string;
}

export interface PedidoDeRascunho {
  mesRef: string;
  /** "o assistido" ou "a assistida". */
  tratamento: string;
  analises: readonly AnaliseDoPeriodo[];
  /** As orientações ativas da coordenação geral, que a IA lê antes das análises (E22). */
  orientacoes: readonly Orientacao[];
  /** Os outros documentos ativos (E25); os de fora do período ou sem data vão como contexto. */
  documentos: readonly DocumentoDoPedido[];
}

export interface Rascunho {
  texto: Trechos;
  metasAlcancadas: string[];
  metasDoMes: string[];
}

export const INSTRUCOES_DO_RASCUNHO = [
  'Você redige a evolução mensal de um assistido em intervenção ABA (Análise do Comportamento Aplicada), a partir das análises do atendimento de cada sessão do período e, quando houver, de outros documentos (relatório da escola, de outra terapia, registro da família, avaliação, PEI).',
  '',
  'Regras de redação:',
  '- Português do Brasil, terceira pessoa, linguagem técnica e objetiva.',
  '- Refira-se à criança só pelo tratamento informado ("o assistido" ou "a assistida"). Nunca use nome próprio, nem de profissionais ou familiares.',
  '- Use somente o que está nas análises e nos outros documentos. Não invente fatos, programas, números nem datas. Se não há base para um trecho, devolva esse trecho vazio.',
  '- As análises são a base do texto. Os outros documentos complementam. O documento marcado como contexto é de fora do período ou sem data: use para entender o assistido, não como fato do período.',
  '- Não cite a data de cada sessão.',
  '',
  'O texto tem 5 trechos, nesta ordem:',
  '- abertura: visão geral do período e da participação nas sessões. Se a frequência informada for menor que 75%, cite a frequência.',
  '- programas: os programas e as habilidades trabalhados e o desempenho observado.',
  '- comportamentos: os comportamentos que interferiram nas sessões e o manejo adotado.',
  '- recursos: os recursos, as estratégias e os reforçadores usados.',
  '- fechamento: a síntese da evolução no período.',
  'Somados, os trechos devem passar de 700 caracteres, quando as análises derem base para isso.',
  '',
  'Metas:',
  '- metas_alcancadas: as habilidades que as análises mostram como alcançadas no período, uma por item, em frase curta. Se não houver, devolva a lista vazia.',
  '- metas_do_mes: 4 ou mais metas para o mês seguinte, que deem continuidade ao que foi trabalhado e ainda não foi alcançado, uma por item. Não repita uma meta alcançada.',
].join('\n');

/** As instruções fixas e, depois delas, as orientações ativas, cada uma com o seu campo (E22). */
export function instrucoesDoRascunho(orientacoes: readonly Orientacao[]): string {
  if (orientacoes.length === 0) return INSTRUCOES_DO_RASCUNHO;
  return [
    INSTRUCOES_DO_RASCUNHO,
    '',
    'Orientações da coordenação geral, que valem para todas as evoluções. Siga cada uma no campo indicado:',
    ...orientacoes.map((o) => `- ${o.campo}: ${o.texto}`),
  ].join('\n');
}

const TEXTO = { type: 'string' } as const;
const LISTA = { type: 'array', items: TEXTO } as const;

/** A saída estruturada pedida à IA: as chaves dos 5 trechos e as duas listas de metas. */
export const FORMATO_DO_RASCUNHO = {
  type: 'json_schema',
  json_schema: {
    name: 'rascunho_da_evolucao',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [...TRECHOS, 'metas_alcancadas', 'metas_do_mes'],
      properties: {
        abertura: TEXTO,
        programas: TEXTO,
        comportamentos: TEXTO,
        recursos: TEXTO,
        fechamento: TEXTO,
        metas_alcancadas: LISTA,
        metas_do_mes: LISTA,
      },
    },
  },
} as const;

/** Um documento como vai para a IA: tipo, data, a marca de contexto e o texto. */
function linhaDoDocumento(documento: DocumentoDoPedido, mesRef: string): string {
  const situacao = situacaoDaData(documento.data, mesRef);
  const data = documento.data === null ? 'sem data' : formatarData(documento.data);
  const contexto = situacao === 'no_periodo' ? '' : ', contexto';
  return `[${TIPOS_DE_DOCUMENTO[documento.tipo]}, ${data}${contexto}] ${documento.texto}`;
}

/**
 * O que vai para a IA sobre o período: o mês, a frequência (E04), as análises, uma por sessão, e
 * os outros documentos, se houver (E25).
 */
export function conteudoDoPedido({
  mesRef,
  tratamento,
  analises,
  documentos,
}: PedidoDeRascunho): string {
  const { inicio, fim } = periodoAnalisado(mesRef);
  const sessoes = analises.filter((a) => !a.falta).length;
  const frequencia = Math.round((sessoes / analises.length) * 100);
  return [
    `Evolução de ${formatarMesLongo(mesRef)}. Período analisado: ${formatarData(inicio)} a ${formatarData(fim)}.`,
    `Tratamento: ${tratamento}.`,
    `Frequência: ${String(sessoes)} sessões realizadas em ${String(analises.length)} evoluções diárias (${String(frequencia)}%).`,
    '',
    'Análises do atendimento:',
    ...analises.map((a) => `[${formatarData(a.data, true)}${a.falta ? ', falta' : ''}] ${a.texto}`),
    ...(documentos.length === 0
      ? []
      : ['', 'Outros documentos:', ...documentos.map((d) => linhaDoDocumento(d, mesRef))]),
  ].join('\n');
}

/** O corpo do pedido à API da OpenAI (chat completions, com saída estruturada). */
export function montarPedido(modelo: string, pedido: PedidoDeRascunho) {
  return {
    model: modelo,
    messages: [
      { role: 'system', content: instrucoesDoRascunho(pedido.orientacoes) },
      { role: 'user', content: conteudoDoPedido(pedido) },
    ],
    response_format: FORMATO_DO_RASCUNHO,
  };
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

/** As orientações como vêm do banco; a linha fora do formato fica de fora. */
export function lerOrientacoes(linhas: unknown): Orientacao[] {
  if (!Array.isArray(linhas)) return [];
  return linhas.flatMap((linha: unknown) => {
    if (!ehObjeto(linha) || typeof linha.texto !== 'string') return [];
    const campo = CAMPOS_DA_IA.find((c) => c === linha.campo);
    const texto = linha.texto.trim();
    return campo === undefined || texto === '' ? [] : [{ campo, texto }];
  });
}

/** As metas preenchidas, aparadas e dentro dos limites do banco; `null` se não é uma lista. */
function metasDe(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null;
  return valor
    .filter((meta): meta is string => typeof meta === 'string')
    .map((meta) => meta.trim().slice(0, MAXIMO_DA_META))
    .filter((meta) => meta !== '')
    .slice(0, MAXIMO_DE_METAS);
}

/** Confere o formato do rascunho e o deixa como o banco aceita; `null` se não serve. */
export function lerRascunho(valor: unknown): Rascunho | null {
  if (!ehObjeto(valor)) return null;
  const metasAlcancadas = metasDe(valor.metas_alcancadas);
  const metasDoMes = metasDe(valor.metas_do_mes);
  if (metasAlcancadas === null || metasDoMes === null) return null;
  const texto: Trechos = { ...TRECHOS_VAZIOS };
  for (const trecho of TRECHOS) {
    const escrito = valor[trecho];
    if (typeof escrito !== 'string') return null;
    texto[trecho] = escrito.trim().slice(0, MAXIMO_DO_TRECHO);
  }
  if (TRECHOS.every((trecho) => texto[trecho] === '')) return null;
  return { texto, metasAlcancadas, metasDoMes };
}

/** O rascunho dentro da resposta da API: o JSON em `choices[0].message.content`. */
export function lerRespostaDaIA(resposta: unknown): Rascunho | null {
  const escolha: unknown =
    ehObjeto(resposta) && Array.isArray(resposta.choices) ? resposta.choices[0] : null;
  const mensagem = ehObjeto(escolha) ? escolha.message : null;
  const conteudo = ehObjeto(mensagem) ? mensagem.content : null;
  if (typeof conteudo !== 'string') return null;
  try {
    return lerRascunho(JSON.parse(conteudo));
  } catch {
    return null;
  }
}
