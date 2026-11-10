import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import type { Carteira } from '@/features/cadastros/api/carteiras.api';
import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import type { OpcaoEmCartao } from '@/features/cadastros/components/EscolhaEmCartoes';
import type { ItemDoCadastro, MarcaDoItem } from '@/features/cadastros/components/ListaDoCadastro';
import { ROTULO_DO_TURNO, type Turno, TURNOS } from '@/utils/turno';

/** A carteira com o que a tela mostra da unidade e de quem coordena. */
export interface CarteiraNaTela extends Carteira {
  unidade: Pick<Unidade, 'sigla' | 'nome' | 'ativa'>;
  coordenador: Pick<Pessoa, 'nome' | 'ativo'>;
}

export interface OpcaoDoSeletor {
  valor: string;
  rotulo: string;
}

// A coordenação geral lê todas as unidades e pessoas; os dois só aparecem se o dado sumir.
const SEM_UNIDADE = { sigla: '?', nome: 'Unidade não encontrada', ativa: false };
const SEM_PESSOA = { nome: 'Pessoa não encontrada', ativo: false };

/** Junta as três listas, por sigla da unidade e turno do dia (manhã, tarde, integral). */
export function montarCarteiras(
  carteiras: readonly Carteira[],
  unidades: readonly Unidade[],
  pessoas: readonly Pessoa[],
): CarteiraNaTela[] {
  const unidadePorId = new Map(unidades.map((unidade) => [unidade.id, unidade]));
  const pessoaPorId = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  return carteiras
    .map((carteira) => ({
      ...carteira,
      unidade: unidadePorId.get(carteira.unidadeId) ?? SEM_UNIDADE,
      coordenador: pessoaPorId.get(carteira.coordenadorId) ?? SEM_PESSOA,
    }))
    .sort(
      (a, b) =>
        a.unidade.sigla.localeCompare(b.unidade.sigla, 'pt-BR') ||
        TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno) ||
        a.id - b.id,
    );
}

/** Como a carteira se chama na tela: `UNA · Manhã`. */
export const nomeDaCarteira = ({ unidade, turno }: Pick<CarteiraNaTela, 'unidade' | 'turno'>) =>
  `${unidade.sigla} · ${ROTULO_DO_TURNO[turno]}`;

/**
 * A linha da lista. Na carteira ativa, avisa quando quem coordena ou a unidade foi desativada. O
 * "Editar" diz qual carteira: uma desativada pode ter a mesma unidade e o mesmo turno da ativa.
 */
export function itemDaCarteira(carteira: CarteiraNaTela): ItemDoCadastro {
  const { unidade, coordenador, ativa } = carteira;
  const marcas: MarcaDoItem[] = [];
  if (ativa && !coordenador.ativo) marcas.push({ rotulo: 'Coordenação desativada', tom: 'alerta' });
  if (ativa && !unidade.ativa) marcas.push({ rotulo: 'Unidade desativada', tom: 'alerta' });
  const situacao = ativa ? '' : ', desativada';
  return {
    id: carteira.id,
    sigla: unidade.sigla,
    nome: `${unidade.nome} · ${ROTULO_DO_TURNO[carteira.turno]}`,
    detalhe: coordenador.nome,
    marcas,
    ativo: ativa,
    rotuloDaEdicao: `Editar carteira ${nomeDaCarteira(carteira)} (${coordenador.nome}${situacao})`,
  };
}

/** As unidades que recebem carteira nova: só as ativas. */
export const opcoesDeUnidade = (unidades: readonly Unidade[]): OpcaoDoSeletor[] =>
  unidades
    .filter((unidade) => unidade.ativa)
    .map(({ id, sigla, nome }) => ({ valor: String(id), rotulo: `${sigla} · ${nome}` }));

function rotuloDaCoordenacao(pessoa: Pessoa): string {
  if (!pessoa.ativo) return `${pessoa.nome} (desativada)`;
  if (pessoa.papel !== 'coordenador') return `${pessoa.nome} (sem o papel de coordenação)`;
  return pessoa.nome;
}

/**
 * Quem pode coordenar: as pessoas ativas com o papel de coordenação de unidade. Na alteração,
 * quem coordena hoje aparece mesmo desativada ou sem o papel: a lista não sugere uma troca que
 * ninguém pediu, e o banco recusa salvar com quem não tem o papel.
 */
export const opcoesDeCoordenacao = (pessoas: readonly Pessoa[], atual?: number): OpcaoDoSeletor[] =>
  pessoas
    .filter((pessoa) => pessoa.id === atual || (pessoa.ativo && pessoa.papel === 'coordenador'))
    .map((pessoa) => ({ valor: String(pessoa.id), rotulo: rotuloDaCoordenacao(pessoa) }));

/** Turnos em que a unidade já tem carteira ativa, com quem coordena cada um. */
export const turnosOcupados = (
  carteiras: readonly CarteiraNaTela[],
  unidadeId: number,
): ReadonlyMap<Turno, string> =>
  new Map(
    carteiras
      .filter((carteira) => carteira.ativa && carteira.unidadeId === unidadeId)
      .map((carteira) => [carteira.turno, carteira.coordenador.nome]),
  );

function descricaoDoTurno(ocupados: ReadonlyMap<Turno, string> | null, turno: Turno) {
  if (ocupados === null) return undefined;
  const quem = ocupados.get(turno);
  return quem === undefined ? 'Livre nesta unidade.' : `Já tem carteira ativa, com ${quem}.`;
}

/** Os turnos em cartões; escolhida a unidade, o que já tem carteira ativa não se escolhe. */
export const opcoesDeTurno = (ocupados: ReadonlyMap<Turno, string> | null): OpcaoEmCartao[] =>
  TURNOS.map((turno) => ({
    valor: turno,
    rotulo: ROTULO_DO_TURNO[turno],
    descricao: descricaoDoTurno(ocupados, turno),
    indisponivel: ocupados?.has(turno) === true,
  }));
