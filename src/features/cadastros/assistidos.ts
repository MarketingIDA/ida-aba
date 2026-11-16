import type { Assistido } from '@/features/cadastros/api/assistidos.api';
import type { Plano, Unidade } from '@/features/cadastros/api/cadastros.api';
import {
  type CarteiraNaTela,
  nomeDaCarteira,
  type OpcaoDoSeletor,
} from '@/features/cadastros/carteiras';
import type { ItemDoCadastro, MarcaDoItem } from '@/features/cadastros/components/ListaDoCadastro';
import { ROTULO_DO_TURNO } from '@/utils/turno';

/** O assistido com a carteira (unidade, turno e quem coordena), a unidade e o plano. */
export interface AssistidoNaTela extends Assistido {
  carteira: CarteiraNaTela | undefined;
  /** A unidade do cadastro: o rascunho, sem carteira, só tem esta. */
  unidade: Pick<Unidade, 'sigla' | 'nome'> | undefined;
  plano: Plano | undefined;
}

/** Rascunho: veio da Tita e espera a carteira (e, às vezes, o gênero). */
export const ehRascunho = (assistido: Pick<Assistido, 'carteiraId'>) =>
  assistido.carteiraId === null;

export function montarAssistidos(
  assistidos: readonly Assistido[],
  carteiras: readonly CarteiraNaTela[],
  planos: readonly Plano[],
  unidades: readonly Pick<Unidade, 'id' | 'sigla' | 'nome'>[],
): AssistidoNaTela[] {
  const carteiraPorId = new Map(carteiras.map((carteira) => [carteira.id, carteira]));
  const planoPorId = new Map(planos.map((plano) => [plano.id, plano]));
  const unidadePorId = new Map(unidades.map((unidade) => [unidade.id, unidade]));
  return assistidos.map((assistido) => ({
    ...assistido,
    carteira: assistido.carteiraId === null ? undefined : carteiraPorId.get(assistido.carteiraId),
    unidade: unidadePorId.get(assistido.unidadeId),
    plano: assistido.planoId === null ? undefined : planoPorId.get(assistido.planoId),
  }));
}

/** A carteira por extenso nas escolhas: `UNA · Manhã · Carla`. */
const rotuloDaCarteira = (carteira: CarteiraNaTela) =>
  `${nomeDaCarteira(carteira)} · ${carteira.coordenador.nome}`;

/** O turno com quem coordena ou, no rascunho, o que falta para ele sair do rascunho. */
function daCarteira(assistido: AssistidoNaTela) {
  const { carteira } = assistido;
  if (ehRascunho(assistido)) {
    return assistido.genero === null ? 'Escolha a carteira e o gênero' : 'Escolha a carteira';
  }
  return carteira === undefined
    ? 'Carteira não encontrada'
    : `${ROTULO_DO_TURNO[carteira.turno]} · ${carteira.coordenador.nome}`;
}

/**
 * A linha da lista: a sigla da unidade, o nome, o turno com quem coordena e o plano. Sem plano, a
 * evolução do mês bloqueia: o assistido ativo leva o aviso. O rascunho da Tita leva o seu.
 */
export function itemDoAssistido(assistido: AssistidoNaTela): ItemDoCadastro {
  const { carteira, plano } = assistido;
  const marcas: MarcaDoItem[] = [
    ...(ehRascunho(assistido) ? [{ rotulo: 'Rascunho', tom: 'alerta' as const }] : []),
    ...(assistido.ativo && assistido.planoId === null
      ? [{ rotulo: 'Sem plano', tom: 'alerta' as const }]
      : []),
  ];
  const detalhe = daCarteira(assistido);
  return {
    id: assistido.id,
    sigla: carteira?.unidade.sigla ?? assistido.unidade?.sigla ?? '?',
    nome: assistido.nome,
    detalhe: plano === undefined ? detalhe : `${detalhe} · ${plano.nome}`,
    marcas,
    ativo: assistido.ativo,
    rotuloDoInativo: assistido.genero === 'feminino' ? 'Desativada' : 'Desativado',
  };
}

/** A carteira desativada, ou ativa numa unidade desativada, leva o aviso no rótulo. */
function opcaoDaCarteira(carteira: CarteiraNaTela): OpcaoDoSeletor {
  const avisos = [
    ...(carteira.ativa ? [] : ['desativada']),
    ...(carteira.unidade.ativa ? [] : ['unidade desativada']),
  ];
  const rotulo = rotuloDaCarteira(carteira);
  return {
    valor: String(carteira.id),
    rotulo: avisos.length === 0 ? rotulo : `${rotulo} (${avisos.join(', ')})`,
  };
}

/** As carteiras ativas e, na alteração, a de hoje mesmo desativada (para não sugerir troca). */
export const opcoesDeCarteiraDoAssistido = (
  carteiras: readonly CarteiraNaTela[],
  atual?: number | null,
): OpcaoDoSeletor[] =>
  carteiras.filter((carteira) => carteira.ativa || carteira.id === atual).map(opcaoDaCarteira);

/** O valor do filtro que mostra só os rascunhos da Tita. */
export const FILTRO_DOS_RASCUNHOS = 'rascunho';

/**
 * Os rascunhos e todas as carteiras, para filtrar a lista: a desativada também pode ter assistido
 * antigo.
 */
export const opcoesDoFiltroDeCarteira = (carteiras: readonly CarteiraNaTela[]) => [
  { valor: FILTRO_DOS_RASCUNHOS, rotulo: 'Rascunhos, sem carteira' },
  ...carteiras.map(opcaoDaCarteira),
];

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
  /** O `id` da carteira em texto, `rascunho` para os sem carteira, ou vazio para todos. */
  carteiraId: string;
}

const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const naCarteira = (assistido: AssistidoNaTela, carteiraId: string) =>
  carteiraId === FILTRO_DOS_RASCUNHOS
    ? ehRascunho(assistido)
    : carteiraId === '' || String(assistido.carteiraId) === carteiraId;

/** Pelo nome (sem ligar para acento e maiúscula) e pela carteira (ou só os rascunhos). */
export function filtrarAssistidos(
  assistidos: readonly AssistidoNaTela[],
  { busca, carteiraId }: FiltroDosAssistidos,
): AssistidoNaTela[] {
  const procurado = semAcento(busca.trim());
  return assistidos.filter(
    (assistido) =>
      naCarteira(assistido, carteiraId) && semAcento(assistido.nome).includes(procurado),
  );
}
