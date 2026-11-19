import { TRECHOS, type Trechos } from './evolucao.ts';

/**
 * Gerar uma parte de novo com uma instrução do coordenador (E08). A IA recebe o mesmo pedido do
 * rascunho, o texto atual da parte e a instrução, e só a parte pedida é gravada, como versão nova
 * da IA com a instrução usada (E07). As outras partes não mudam.
 */
export type ParteDaIA = 2 | 3 | 4;

export const MAXIMO_DA_INSTRUCAO = 500;

export interface PedidoDaParte {
  numero: ParteDaIA;
  instrucao: string;
}

const NOME_DA_PARTE: Record<ParteDaIA, string> = {
  2: 'o texto da evolução (os 5 trechos)',
  3: 'metas_alcancadas',
  4: 'metas_do_mes',
};

/** O que o corpo da chamada pede: `parte` nula é o rascunho inteiro; `valido` falso é recusa. */
export interface LeituraDoPedido {
  valido: boolean;
  parte: PedidoDaParte | null;
}

const INVALIDO: LeituraDoPedido = { valido: false, parte: null };

/**
 * A parte pedida no corpo da chamada. Fora do formato (parte que não é 2, 3 ou 4, ou instrução
 * vazia ou longa), o pedido é inválido.
 */
export function lerPedidoDaParte(corpo: Record<string, unknown>): LeituraDoPedido {
  const { numero, instrucao } = corpo;
  if (numero === undefined && instrucao === undefined) return { valido: true, parte: null };
  if (numero !== 2 && numero !== 3 && numero !== 4) return INVALIDO;
  if (typeof instrucao !== 'string') return INVALIDO;
  const aparada = instrucao.trim();
  if (aparada === '' || aparada.length > MAXIMO_DA_INSTRUCAO) return INVALIDO;
  return { valido: true, parte: { numero, instrucao: aparada } };
}

/** O conteúdo atual da parte como texto: os trechos com o nome de cada um, ou uma meta por linha. */
export function textoAtualDaParte(numero: ParteDaIA, conteudo: unknown): string {
  if (typeof conteudo !== 'object' || conteudo === null) return '';
  if (numero === 2) {
    const trechos = conteudo as Partial<Trechos>;
    return TRECHOS.map((t) => `${t}: ${trechos[t] ?? ''}`).join('\n');
  }
  const metas = (conteudo as { metas?: unknown }).metas;
  return Array.isArray(metas) ? metas.map((m) => `- ${String(m)}`).join('\n') : '';
}

/** O que vai para a IA depois do pedido do rascunho: a parte, o texto atual e a instrução. */
export function pedidoDaParteDeNovo(pedido: PedidoDaParte, textoAtual: string): string {
  return [
    `Gere de novo só ${NOME_DA_PARTE[pedido.numero]}. As outras partes da resposta serão descartadas.`,
    'Siga as mesmas regras: use só o que está nas análises e nos documentos, sem inventar fato.',
    '',
    'Texto atual desta parte:',
    textoAtual === '' ? '(vazio)' : textoAtual,
    '',
    `Instrução do coordenador: ${pedido.instrucao}`,
  ].join('\n');
}
