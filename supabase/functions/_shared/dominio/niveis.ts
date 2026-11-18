/**
 * O nível de apoio (E27): o que a IA recebe para ler o nível de cada meta em cada sessão e como a
 * resposta vira os pontos da escada. A IA aponta, para cada sessão e meta em que o programa
 * aparece, os níveis citados e o trecho; a regra do nível de mais apoio e a conferência do trecho
 * são daqui, não da IA. Nada é inventado (E06): trecho que não está na análise não vira ponto.
 *
 * Domínio puro: a Edge Function só junta as peças e fala com a rede.
 */

/** Os 5 degraus, do de mais apoio (1) ao independente (5). */
export const NIVEIS_DE_APOIO = [
  'Ajuda física total',
  'Ajuda física parcial',
  'Dica gestual ou modelo',
  'Dica verbal',
  'Independente',
] as const;

/** O tamanho máximo do trecho, como no banco. */
export const MAXIMO_DO_TRECHO = 1000;

/** Uma sessão do período, já sem o nome do assistido (E05). */
export interface SessaoDoPedido {
  /** `AAAA-MM-DD` */
  data: string;
  texto: string;
}

/** Uma meta do cadastro com programa, já sem o nome. */
export interface MetaDoPedido {
  id: number;
  programa: string;
  texto: string;
}

/** Um ponto da escada: a meta, o dia, o nível (nulo: trabalhada sem nível) e o trecho. */
export interface NivelLido {
  metaId: number;
  data: string;
  nivel: number | null;
  trecho: string;
}

export const INSTRUCOES_DOS_NIVEIS = [
  'Você lê análises de sessões de intervenção ABA (Análise do Comportamento Aplicada) e aponta, para cada meta, o nível de apoio que o assistido precisou.',
  '',
  'Os níveis, do de mais apoio ao de menos:',
  ...NIVEIS_DE_APOIO.map((nome, i) => `${String(i + 1)}: ${nome}`),
  '',
  'Regras:',
  '- Para cada sessão, aponte só as metas cujo programa ou habilidade a análise cita. Se a sessão não cita a meta, não a aponte.',
  '- Em "niveis", liste todos os níveis que o trecho cita para aquela meta, pelo número. Se o trecho não diz o nível, devolva a lista vazia. Não deduza nível que o texto não diz.',
  '- Em "trecho", copie, sem mudar nada, a frase da análise de onde o nível saiu (ou a que cita o programa, se não há nível).',
  '- Use o número da sessão e o número da meta como vieram no pedido.',
].join('\n');

/** A saída estruturada pedida à IA. */
export const FORMATO_DOS_NIVEIS = {
  type: 'json_schema',
  json_schema: {
    name: 'niveis_de_apoio',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['leituras'],
      properties: {
        leituras: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['sessao', 'meta', 'niveis', 'trecho'],
            properties: {
              sessao: { type: 'integer' },
              meta: { type: 'integer' },
              niveis: { type: 'array', items: { type: 'integer' } },
              trecho: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

/** O que vai para a IA: as metas numeradas e as sessões numeradas, sem datas nem nomes. */
export function conteudoDosNiveis(
  metas: readonly MetaDoPedido[],
  sessoes: readonly SessaoDoPedido[],
): string {
  return [
    'Metas:',
    ...metas.map((m, i) => `[meta ${String(i + 1)}] ${m.programa}: ${m.texto}`),
    '',
    'Análises das sessões:',
    ...sessoes.map((s, i) => `[sessão ${String(i + 1)}] ${s.texto}`),
  ].join('\n');
}

/** O corpo do pedido à API da OpenAI (chat completions, com saída estruturada). */
export function montarPedidoDosNiveis(
  modelo: string,
  metas: readonly MetaDoPedido[],
  sessoes: readonly SessaoDoPedido[],
) {
  return {
    model: modelo,
    messages: [
      { role: 'system', content: INSTRUCOES_DOS_NIVEIS },
      { role: 'user', content: conteudoDosNiveis(metas, sessoes) },
    ],
    response_format: FORMATO_DOS_NIVEIS,
  };
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

/** Sem acento, em minúsculas e com um espaço só: para achar o trecho na análise. */
const normalizar = (texto: string) =>
  texto.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase().replaceAll(/\s+/g, ' ').trim();

/** O ponto de uma leitura da IA, ou `null` se ela não serve. */
function pontoDaLeitura(
  leitura: unknown,
  metas: readonly MetaDoPedido[],
  sessoes: readonly SessaoDoPedido[],
): NivelLido | null {
  if (!ehObjeto(leitura) || typeof leitura.trecho !== 'string' || !Array.isArray(leitura.niveis)) {
    return null;
  }
  const meta = typeof leitura.meta === 'number' ? metas[leitura.meta - 1] : undefined;
  const sessao = typeof leitura.sessao === 'number' ? sessoes[leitura.sessao - 1] : undefined;
  const trecho = leitura.trecho.trim().slice(0, MAXIMO_DO_TRECHO);
  if (meta === undefined || sessao === undefined || trecho === '') return null;
  if (!normalizar(sessao.texto).includes(normalizar(trecho))) return null;
  const niveis = leitura.niveis.filter(
    (n): n is number => Number.isInteger(n) && n >= 1 && n <= NIVEIS_DE_APOIO.length,
  );
  // Quando o trecho cita mais de um nível, vale o de mais apoio: a leitura nunca exagera o avanço.
  const nivel = niveis.length === 0 ? null : Math.min(...niveis);
  return { metaId: meta.id, data: sessao.data, nivel, trecho };
}

/**
 * Junta as sessões do mesmo dia: vale o nível de mais apoio entre as que têm nível; sem nível no
 * dia todo, o ponto fica sem nível.
 */
function juntarPorDia(pontos: readonly NivelLido[]): NivelLido[] {
  const porChave = new Map<string, NivelLido>();
  for (const ponto of pontos) {
    const chave = `${String(ponto.metaId)}|${ponto.data}`;
    const atual = porChave.get(chave);
    const melhor =
      atual === undefined ||
      (ponto.nivel !== null && (atual.nivel === null || ponto.nivel < atual.nivel));
    if (melhor) porChave.set(chave, ponto);
  }
  return [...porChave.values()];
}

/** Os pontos dentro da resposta da API (o JSON em `choices[0].message.content`); `null` se não serve. */
export function lerRespostaDosNiveis(
  resposta: unknown,
  metas: readonly MetaDoPedido[],
  sessoes: readonly SessaoDoPedido[],
): NivelLido[] | null {
  const escolha: unknown =
    ehObjeto(resposta) && Array.isArray(resposta.choices) ? resposta.choices[0] : null;
  const mensagem = ehObjeto(escolha) ? escolha.message : null;
  const conteudo = ehObjeto(mensagem) ? mensagem.content : null;
  if (typeof conteudo !== 'string') return null;
  let corpo: unknown;
  try {
    corpo = JSON.parse(conteudo);
  } catch {
    return null;
  }
  if (!ehObjeto(corpo) || !Array.isArray(corpo.leituras)) return null;
  const pontos = corpo.leituras.flatMap((leitura: unknown) => {
    const ponto = pontoDaLeitura(leitura, metas, sessoes);
    return ponto === null ? [] : [ponto];
  });
  return juntarPorDia(pontos);
}
