import { TRECHOS, type Trechos } from './evolucao.ts';
import { situacaoDaData, TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from './documentos.ts';
import type { FraseDoCampo } from './fontes.ts';
import { LIMITE_DA_FREQUENCIA } from './frequencia.ts';
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
  /** O plano terapêutico (E23): as metas em desenvolvimento e as já alcançadas, sem o nome. */
  metas?: MetasDoPlano;
}

export interface MetasDoPlano {
  emDesenvolvimento: readonly string[];
  jaAlcancadas: readonly string[];
}

export interface Rascunho {
  texto: Trechos;
  metasAlcancadas: string[];
  metasDoMes: string[];
  /** Cada frase e cada meta com os números das sessões e dos documentos de onde saiu (E06). */
  frases: FraseDoCampo[];
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
  '- Não cite o nome do mês nem o ano. Para falar do período, escreva "no mês atual" (por exemplo, a abertura começa com "No mês atual, …").',
  '- Não cite a quantidade de sessões. Cite a frequência só quando ela vier informada.',
  '',
  'Fontes: cada análise tem um número de sessão (S1, S2, …) e cada outro documento um número (D1, D2, …). Escreva cada trecho como uma lista de frases e, em cada frase e em cada meta, informe em "sessoes" os números das sessões e em "documentos" os números dos documentos que a sustentam (só o número, sem a letra). Não indique fonte que não sustenta a frase.',
  '',
  'O texto tem 5 trechos, nesta ordem:',
  '- abertura: visão geral do período e da participação nas sessões. Se a frequência vier informada, cite a frequência (ela só vem quando está abaixo de 75%).',
  '- programas: os programas e as habilidades trabalhados e o desempenho observado.',
  '- comportamentos: os comportamentos que interferiram nas sessões e o manejo adotado.',
  '- recursos: os recursos, as estratégias e os reforçadores usados.',
  '- fechamento: a síntese da evolução no período.',
  'Somados, os trechos devem passar de 700 caracteres, quando as análises derem base para isso.',
  '',
  'Metas:',
  '- metas_alcancadas: as habilidades que as análises mostram como alcançadas no período, uma por item, em frase curta. Quando for uma meta do plano terapêutico, copie o texto da meta como está no plano. Se não houver, devolva a lista vazia.',
  '- metas_do_mes: 4 ou mais metas para o mês seguinte, uma por item. Comece pelas metas do plano terapêutico em desenvolvimento, com o texto como está no plano, tirando as que alcançou neste período; acrescente meta nova só para dar continuidade ao que foi trabalhado. Nunca repita uma meta alcançada, nem as já alcançadas do plano.',
].join('\n');

/**
 * As orientações ativas (E22), agrupadas por campo, com a regra de que prevalecem. Sem a regra, a
 * IA ficava com a instrução fixa ou com o dado do pedido quando os dois diziam o contrário (a
 * abertura seguia citando as sessões e a frequência mesmo com a orientação de tirá-las).
 */
export function blocoDasOrientacoes(orientacoes: readonly Orientacao[]): string[] {
  const campos = [...new Set(orientacoes.map((o) => o.campo))];
  return [
    '',
    'Orientações da coordenação geral (valem para todas as evoluções):',
    'Elas PREVALECEM sobre as regras acima e sobre os dados recebidos. Quando uma orientação mandar tirar, resumir ou mudar algo num campo, faça isso, mesmo que uma regra acima ou um dado diga o contrário. Antes de responder, confira cada campo contra as orientações dele.',
    ...campos.flatMap((campo) => [
      `- ${campo}:`,
      ...orientacoes.filter((o) => o.campo === campo).map((o) => `  - ${o.texto}`),
    ]),
  ];
}

/** As instruções fixas e, depois delas, as orientações ativas, que prevalecem (E22). */
export function instrucoesDoRascunho(orientacoes: readonly Orientacao[]): string {
  if (orientacoes.length === 0) return INSTRUCOES_DO_RASCUNHO;
  return [INSTRUCOES_DO_RASCUNHO, ...blocoDasOrientacoes(orientacoes)].join('\n');
}

const TEXTO = { type: 'string' } as const;
const NUMEROS = { type: 'array', items: { type: 'integer' } } as const;
/** Uma lista de frases, cada uma com as sessões e os documentos de onde saiu (E06). */
const FRASES = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['texto', 'sessoes', 'documentos'],
    properties: { texto: TEXTO, sessoes: NUMEROS, documentos: NUMEROS },
  },
} as const;

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
        abertura: FRASES,
        programas: FRASES,
        comportamentos: FRASES,
        recursos: FRASES,
        fechamento: FRASES,
        metas_alcancadas: FRASES,
        metas_do_mes: FRASES,
      },
    },
  },
} as const;

/** Um documento como vai para a IA: tipo, data, a marca de contexto e o texto. */
function linhaDoDocumento(documento: DocumentoDoPedido, mesRef: string, indice: number): string {
  const situacao = situacaoDaData(documento.data, mesRef);
  const data = documento.data === null ? 'sem data' : formatarData(documento.data);
  const contexto = situacao === 'no_periodo' ? '' : ', contexto';
  return `[D${String(indice + 1)}, ${TIPOS_DE_DOCUMENTO[documento.tipo]}, ${data}${contexto}] ${documento.texto}`;
}

/** O plano terapêutico, quando há metas no cadastro (E23). */
function linhasDoPlano(metas: MetasDoPlano | undefined): string[] {
  if (metas === undefined) return [];
  const lista = (titulo: string, itens: readonly string[]) =>
    itens.length === 0 ? [] : ['', titulo, ...itens.map((m) => `- ${m}`)];
  return [
    ...lista('Plano terapêutico, metas em desenvolvimento:', metas.emDesenvolvimento),
    ...lista('Plano terapêutico, metas já alcançadas:', metas.jaAlcancadas),
  ];
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
  metas,
}: PedidoDeRascunho): string {
  const { inicio, fim } = periodoAnalisado(mesRef);
  const sessoes = analises.filter((a) => !a.falta).length;
  const frequencia = Math.round((sessoes / analises.length) * 100);
  // A frequência só vai quando o texto deve citá-la (E04): com a linha pronta, a IA a copiava
  // para a abertura mesmo acima do limite. Sem análise, a conta dá NaN e a linha não vai.
  const citarFrequencia = frequencia < LIMITE_DA_FREQUENCIA;
  return [
    `Evolução de ${formatarMesLongo(mesRef)}. Período analisado: ${formatarData(inicio)} a ${formatarData(fim)}.`,
    `Tratamento: ${tratamento}.`,
    ...(citarFrequencia
      ? [
          `Frequência: ${String(sessoes)} sessões realizadas em ${String(analises.length)} evoluções diárias (${String(frequencia)}%).`,
        ]
      : []),
    '',
    'Análises do atendimento:',
    ...analises.map(
      (a, i) =>
        `[S${String(i + 1)}, ${formatarData(a.data, true)}${a.falta ? ', falta' : ''}] ${a.texto}`,
    ),
    ...(documentos.length === 0
      ? []
      : ['', 'Outros documentos:', ...documentos.map((d, i) => linhaDoDocumento(d, mesRef, i))]),
    ...linhasDoPlano(metas),
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

export { lerRascunho, lerRespostaDaIA } from './leituraDoRascunho.ts';
