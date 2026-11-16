import type { ResultadoDoLote } from '@/features/cadastros/api/assistidos.api';
import {
  type AssistidoNaTela,
  ehRascunho,
  rotuloDaCarteira,
} from '@/features/cadastros/assistidos';
import type { CarteiraNaTela } from '@/features/cadastros/carteiras';
import { contar } from '@/features/cadastros/tita';

/** Os textos dos rascunhos da Tita postos numa carteira em lote (E28). */

/** O rascunho que vai em lote. O sem gênero passa pelo formulário: o banco o recusaria. */
export const vaiEmLote = (assistido: Pick<AssistidoNaTela, 'carteiraId' | 'genero'>) =>
  ehRascunho(assistido) && assistido.genero !== null;

/** Antes de gravar: quantos vão, para qual carteira e quantos mudam de unidade. */
export function textoDaConfirmacao(
  marcados: readonly Pick<AssistidoNaTela, 'unidadeId'>[],
  carteira: CarteiraNaTela,
): string {
  const deFora = marcados.filter((a) => a.unidadeId !== carteira.unidadeId).length;
  const mudam =
    deFora === 0
      ? ''
      : ` ${contar(deFora, 'vem de outra unidade e passa', 'vêm de outra unidade e passam')} para a ${carteira.unidade.sigla}.`;
  return `${contar(marcados.length, 'rascunho vai', 'rascunhos vão')} para ${rotuloDaCarteira(carteira)}.${mudam} Na carteira, o assistido não volta a ser rascunho.`;
}

/** Depois de gravar: quantos entraram e, se o banco deixou algum de fora, por quê. */
export function textoDoLote(
  { postos, semGenero, comCarteira }: ResultadoDoLote,
  carteira: CarteiraNaTela,
): string {
  const partes = [
    `${contar(postos, 'rascunho posto', 'rascunhos postos')} em ${rotuloDaCarteira(carteira)}.`,
    ...(semGenero > 0
      ? [`${contar(semGenero, 'ficou', 'ficaram')} de fora sem gênero: escolha no cadastro.`]
      : []),
    ...(comCarteira > 0 ? [`${contar(comCarteira, 'já tinha', 'já tinham')} carteira.`] : []),
  ];
  return partes.join(' ');
}
