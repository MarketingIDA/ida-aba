import { MAXIMO_DO_TRECHO, TRECHOS, type Trechos } from './evolucao.ts';
import { blocoDasOrientacoes, type Orientacao } from './rascunho.ts';

/**
 * "Aprimorar com a IA" na evolução escrita à mão (E26): a IA recebe os 5 trechos que o coordenador
 * escreveu, já sem o nome (E05), e devolve a mesma coisa com linguagem melhor, sem fato novo. A
 * saída é conferida trecho por trecho contra o original: o que não passa fica como o coordenador
 * escreveu. As metas (partes 3 e 4) não vão: o texto delas é o do cadastro (E12, E23).
 *
 * Domínio puro: a Edge Function só junta as peças e fala com a rede.
 */
export const INSTRUCAO_DO_APRIMORAMENTO = 'Aprimorar com a IA o texto escrito à mão';

/** Um termo da lista da coordenação geral e a palavra que o substitui. */
export interface TermoDaLista {
  termo: string;
  substituto: string;
}

export interface PedidoDeAprimoramento {
  /** "o assistido" ou "a assistida". */
  tratamento: string;
  /** Os 5 trechos como o coordenador escreveu, sem o nome. */
  trechos: Trechos;
  /** Os programas do plano terapêutico, que o texto precisa manter como estão (E10). */
  programas: readonly string[];
  termos: readonly TermoDaLista[];
  orientacoes: readonly Orientacao[];
}

export const INSTRUCOES_DO_APRIMORAMENTO = [
  'Você revisa a evolução mensal de um assistido em intervenção ABA (Análise do Comportamento Aplicada), escrita pelo coordenador.',
  '',
  'Regras:',
  '- Melhore só a linguagem: português do Brasil, terceira pessoa, termos técnicos da ABA, frases claras e coesas.',
  '- Não acrescente fato, programa, número, data, comportamento nem conclusão que não esteja no texto. Não tire informação.',
  '- Refira-se à criança só pelo tratamento informado ("o assistido" ou "a assistida"). Nunca use nome próprio.',
  '- Cada trecho continua no seu lugar. Trecho vazio fica vazio.',
  '- Mantenha o nome de cada programa do plano terapêutico exatamente como está escrito, quando o texto o citar.',
  '- Troque cada termo da lista de termos inadequados pelo substituto indicado.',
].join('\n');

/** As instruções fixas e, depois, as orientações ativas dos 5 trechos (E22). */
export function instrucoesDoAprimoramento(orientacoes: readonly Orientacao[]): string {
  const dosTrechos = orientacoes.filter((o) => (TRECHOS as readonly string[]).includes(o.campo));
  if (dosTrechos.length === 0) return INSTRUCOES_DO_APRIMORAMENTO;
  return [INSTRUCOES_DO_APRIMORAMENTO, ...blocoDasOrientacoes(dosTrechos)].join('\n');
}

/** A saída estruturada: os 5 trechos, cada um um texto. */
export const FORMATO_DO_APRIMORAMENTO = {
  type: 'json_schema',
  json_schema: {
    name: 'texto_aprimorado',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [...TRECHOS],
      properties: Object.fromEntries(TRECHOS.map((t) => [t, { type: 'string' }])),
    },
  },
} as const;

/** O que vai para a IA: o tratamento, os programas do plano, os termos e os 5 trechos. */
export function conteudoDoAprimoramento(pedido: PedidoDeAprimoramento): string {
  const lista = (titulo: string, itens: readonly string[]) =>
    itens.length === 0 ? [] : ['', titulo, ...itens.map((i) => `- ${i}`)];
  return [
    `Tratamento: ${pedido.tratamento}.`,
    ...lista('Programas do plano terapêutico:', pedido.programas),
    ...lista(
      'Termos inadequados e o substituto:',
      pedido.termos.map((t) => `${t.termo} → ${t.substituto}`),
    ),
    '',
    'Texto escrito pelo coordenador:',
    ...TRECHOS.map((t) => `${t}: ${pedido.trechos[t]}`),
  ].join('\n');
}

/** O corpo do pedido à API da OpenAI (chat completions, com saída estruturada). */
export function montarAprimoramento(modelo: string, pedido: PedidoDeAprimoramento) {
  return {
    model: modelo,
    messages: [
      { role: 'system', content: instrucoesDoAprimoramento(pedido.orientacoes) },
      { role: 'user', content: conteudoDoAprimoramento(pedido) },
    ],
    response_format: FORMATO_DO_APRIMORAMENTO,
  };
}

const numerosDe = (texto: string) => texto.match(/\d+/g) ?? [];

/** O trecho aprimorado, se passa na conferência; senão, o original. */
function conferirTrecho(original: string, novo: unknown): string {
  const antes = original.trim();
  if (antes === '') return '';
  const depois = typeof novo === 'string' ? novo.trim() : '';
  if (depois === '' || depois.length > MAXIMO_DO_TRECHO) return antes;
  const conhecidos = new Set(numerosDe(antes));
  return numerosDe(depois).every((n) => conhecidos.has(n)) ? depois : antes;
}

/** O JSON dentro da resposta da API, em `choices[0].message.content`; `null` se não há. */
function objetoDaResposta(resposta: unknown): Record<string, unknown> | null {
  const escolhas = (resposta as { choices?: unknown } | null)?.choices;
  const conteudo = Array.isArray(escolhas)
    ? (escolhas[0] as { message?: { content?: unknown } } | undefined)?.message?.content
    : undefined;
  if (typeof conteudo !== 'string') return null;
  try {
    const lido: unknown = JSON.parse(conteudo);
    return typeof lido === 'object' && lido !== null ? (lido as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Confere a resposta contra o que o coordenador escreveu (E26): trecho vazio fica vazio, trecho
 * escrito não some, e número que não estava no trecho faz o trecho voltar ao original. `null` se a
 * resposta está fora do formato.
 */
export function conferirAprimoramento(original: Trechos, resposta: unknown): Trechos | null {
  const novo = objetoDaResposta(resposta);
  if (novo === null) return null;
  const trechos = { ...original };
  for (const t of TRECHOS) trechos[t] = conferirTrecho(original[t], novo[t]);
  return trechos;
}
