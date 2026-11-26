import {
  MAXIMO_DA_META,
  MAXIMO_DE_METAS,
  MAXIMO_DO_TRECHO,
  TRECHOS,
  TRECHOS_VAZIOS,
  type Trechos,
} from './evolucao.ts';
import { type FraseDoCampo, type FraseLida, lerFrases } from './fontes.ts';
import type { Rascunho } from './rascunho.ts';

/**
 * A leitura da resposta da IA (E06): cada trecho e cada lista de metas vêm como frases com as
 * fontes; o texto é a junção das frases, nos limites do banco. O que não segue o formato é recusado.
 */
function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

/** As metas dentro dos limites do banco, cada uma com as suas fontes; `null` se não é lista. */
function metasDe(valor: unknown): FraseLida[] | null {
  return (
    lerFrases(valor)
      ?.map((meta) => ({ ...meta, texto: meta.texto.slice(0, MAXIMO_DA_META) }))
      .slice(0, MAXIMO_DE_METAS) ?? null
  );
}

const noCampo = (campo: string, frases: readonly FraseLida[]): FraseDoCampo[] =>
  frases.map((frase, ordem) => ({ ...frase, campo, ordem }));

/**
 * Confere o formato do rascunho e o deixa como o banco aceita; `null` se não serve.
 *
 * `parte` é a parte gerada de novo (E08), ou `null` no rascunho inteiro. Só a parte pedida é
 * gravada, e a IA devolve as outras vazias: o texto vazio só invalida a resposta quando é o texto
 * (ou o rascunho inteiro) que foi pedido, e as metas do mês vazias, quando são elas as pedidas.
 */
export function lerRascunho(valor: unknown, parte: 2 | 3 | 4 | null = null): Rascunho | null {
  if (!ehObjeto(valor)) return null;
  const alcancadas = metasDe(valor.metas_alcancadas);
  const doMes = metasDe(valor.metas_do_mes);
  if (alcancadas === null || doMes === null) return null;
  const texto: Trechos = { ...TRECHOS_VAZIOS };
  const frases: FraseDoCampo[] = [];
  for (const trecho of TRECHOS) {
    const lidas = lerFrases(valor[trecho]);
    if (lidas === null) return null;
    texto[trecho] = lidas
      .map((f) => f.texto)
      .join(' ')
      .slice(0, MAXIMO_DO_TRECHO);
    frases.push(...noCampo(trecho, lidas));
  }
  const semTexto = TRECHOS.every((trecho) => texto[trecho] === '');
  if (semTexto && (parte === null || parte === 2)) return null;
  if (parte === 4 && doMes.length === 0) return null;
  frases.push(...noCampo('metas_alcancadas', alcancadas), ...noCampo('metas_do_mes', doMes));
  return {
    texto,
    metasAlcancadas: alcancadas.map((m) => m.texto),
    metasDoMes: doMes.map((m) => m.texto),
    frases,
  };
}

/** O rascunho dentro da resposta da API: o JSON em `choices[0].message.content`. */
export function lerRespostaDaIA(
  resposta: unknown,
  parte: 2 | 3 | 4 | null = null,
): Rascunho | null {
  const escolha: unknown =
    ehObjeto(resposta) && Array.isArray(resposta.choices) ? resposta.choices[0] : null;
  const mensagem = ehObjeto(escolha) ? escolha.message : null;
  const conteudo = ehObjeto(mensagem) ? mensagem.content : null;
  if (typeof conteudo !== 'string') return null;
  try {
    return lerRascunho(JSON.parse(conteudo), parte);
  } catch {
    return null;
  }
}
