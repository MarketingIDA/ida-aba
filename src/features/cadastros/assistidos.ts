import type { Assistido } from '@/features/cadastros/api/assistidos.api';
import type { Plano } from '@/features/cadastros/api/cadastros.api';
import {
  type CarteiraNaTela,
  nomeDaCarteira,
  type OpcaoDoSeletor,
} from '@/features/cadastros/carteiras';
import type { ItemDoCadastro, MarcaDoItem } from '@/features/cadastros/components/ListaDoCadastro';
import { ROTULO_DO_TURNO } from '@/utils/turno';

/** O assistido com a carteira (unidade, turno e quem coordena) e o plano. */
export interface AssistidoNaTela extends Assistido {
  carteira: CarteiraNaTela | undefined;
  plano: Plano | undefined;
}

export function montarAssistidos(
  assistidos: readonly Assistido[],
  carteiras: readonly CarteiraNaTela[],
  planos: readonly Plano[],
): AssistidoNaTela[] {
  const carteiraPorId = new Map(carteiras.map((carteira) => [carteira.id, carteira]));
  const planoPorId = new Map(planos.map((plano) => [plano.id, plano]));
  return assistidos.map((assistido) => ({
    ...assistido,
    carteira: carteiraPorId.get(assistido.carteiraId),
    plano: assistido.planoId === null ? undefined : planoPorId.get(assistido.planoId),
  }));
}

/** A carteira por extenso nas escolhas: `UNA · Manhã · Carla`. */
const rotuloDaCarteira = (carteira: CarteiraNaTela) =>
  `${nomeDaCarteira(carteira)} · ${carteira.coordenador.nome}`;

/**
 * A linha da lista: a sigla da unidade, o nome, o turno com quem coordena e o plano. Sem plano, a
 * evolução do mês bloqueia: o assistido ativo leva o aviso.
 */
export function itemDoAssistido(assistido: AssistidoNaTela): ItemDoCadastro {
  const { carteira, plano } = assistido;
  const marcas: MarcaDoItem[] =
    assistido.ativo && assistido.planoId === null ? [{ rotulo: 'Sem plano', tom: 'alerta' }] : [];
  const daCarteira =
    carteira === undefined
      ? 'Carteira não encontrada'
      : `${ROTULO_DO_TURNO[carteira.turno]} · ${carteira.coordenador.nome}`;
  return {
    id: assistido.id,
    sigla: carteira?.unidade.sigla ?? '?',
    nome: assistido.nome,
    detalhe: plano === undefined ? daCarteira : `${daCarteira} · ${plano.nome}`,
    marcas,
    ativo: assistido.ativo,
    rotuloDoInativo: assistido.genero === 'feminino' ? 'Desativada' : 'Desativado',
  };
}

const opcaoDaCarteira = (carteira: CarteiraNaTela): OpcaoDoSeletor => ({
  valor: String(carteira.id),
  rotulo: carteira.ativa
    ? rotuloDaCarteira(carteira)
    : `${rotuloDaCarteira(carteira)} (desativada)`,
});

/** As carteiras ativas e, na alteração, a de hoje mesmo desativada (para não sugerir troca). */
export const opcoesDeCarteiraDoAssistido = (
  carteiras: readonly CarteiraNaTela[],
  atual?: number,
): OpcaoDoSeletor[] =>
  carteiras.filter((carteira) => carteira.ativa || carteira.id === atual).map(opcaoDaCarteira);

/** Todas as carteiras, para filtrar a lista: a desativada também pode ter assistido antigo. */
export const opcoesDoFiltroDeCarteira = (carteiras: readonly CarteiraNaTela[]) =>
  carteiras.map(opcaoDaCarteira);

/** Os planos ativos e, na alteração, o de hoje mesmo desativado. */
export const opcoesDePlano = (planos: readonly Plano[], atual?: number | null): OpcaoDoSeletor[] =>
  planos
    .filter((plano) => plano.ativo || plano.id === atual)
    .map((plano) => ({
      valor: String(plano.id),
      rotulo: plano.ativo ? plano.nome : `${plano.nome} (desativado)`,
    }));

export interface FiltroDosAssistidos {
  busca: string;
  /** O `id` da carteira em texto, ou vazio para todas. */
  carteiraId: string;
}

const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Pelo nome (sem ligar para acento e maiúscula) e pela carteira. */
export function filtrarAssistidos(
  assistidos: readonly AssistidoNaTela[],
  { busca, carteiraId }: FiltroDosAssistidos,
): AssistidoNaTela[] {
  const procurado = semAcento(busca.trim());
  return assistidos.filter(
    (assistido) =>
      (carteiraId === '' || String(assistido.carteiraId) === carteiraId) &&
      semAcento(assistido.nome).includes(procurado),
  );
}
