import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import type { Carteira, PassoDaAtribuicao } from '@/features/cadastros/api/carteiras.api';
import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import type { OpcaoEmCartao } from '@/features/cadastros/components/EscolhaEmCartoes';
import type { ItemDoCadastro, MarcaDoItem } from '@/features/cadastros/components/ListaDoCadastro';
import { ROTULO_DO_TURNO, type Turno, TURNOS } from '@/utils/turno';

/** A carteira com o que a tela mostra da unidade e de quem coordena. */
export interface CarteiraNaTela extends Carteira {
  unidade: Pick<Unidade, 'sigla' | 'nome' | 'ativa'>;
  /** Sem coordenador, o nome diz isso: é o que as escolhas e as listas mostram. */
  coordenador: Pick<Pessoa, 'nome' | 'ativo'>;
}

export interface OpcaoDoSeletor {
  valor: string;
  rotulo: string;
}

// A coordenação lê todas as unidades e pessoas; os dois só aparecem se o dado sumir.
const SEM_UNIDADE = { sigla: '?', nome: 'Unidade não encontrada', ativa: false };
const SEM_PESSOA = { nome: 'Pessoa não encontrada', ativo: false };
export const SEM_COORDENADOR = 'Sem coordenador';

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
      coordenador:
        carteira.coordenadorId === null
          ? { nome: SEM_COORDENADOR, ativo: true }
          : (pessoaPorId.get(carteira.coordenadorId) ?? SEM_PESSOA),
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

/** A unidade e o turno numa chave só: é o que a pessoa escolhe ao receber uma carteira. */
export const chaveDaCarteira = ({ unidadeId, turno }: Pick<Carteira, 'unidadeId' | 'turno'>) =>
  `${String(unidadeId)}:${turno}`;

/**
 * A carteira como a aba Carteiras mostra: uma por unidade e turno, com todos os que a coordenam.
 * No banco, cada coordenador tem a sua linha (os seus assistidos e o seu arquivo do mês).
 */
export interface CarteiraDaLista extends Pick<CarteiraNaTela, 'unidadeId' | 'turno' | 'unidade'> {
  /** O `id` da primeira linha: identifica a carteira na lista. */
  id: number;
  /** Ativa enquanto alguma linha estiver ativa. */
  ativa: boolean;
  /** As linhas ativas; na carteira desativada, todas. */
  linhas: CarteiraNaTela[];
}

/** Junta as linhas da mesma unidade e turno, na ordem em que chegam. */
export function agruparCarteiras(carteiras: readonly CarteiraNaTela[]): CarteiraDaLista[] {
  const porChave = new Map<string, CarteiraNaTela[]>();
  for (const carteira of carteiras) {
    const chave = chaveDaCarteira(carteira);
    porChave.set(chave, [...(porChave.get(chave) ?? []), carteira]);
  }
  return [...porChave.values()].map((todas) => {
    const ativas = todas.filter((carteira) => carteira.ativa);
    const linhas = ativas.length > 0 ? ativas : todas;
    const [primeira] = linhas as [CarteiraNaTela, ...CarteiraNaTela[]];
    return {
      id: primeira.id,
      unidadeId: primeira.unidadeId,
      turno: primeira.turno,
      unidade: primeira.unidade,
      ativa: ativas.length > 0,
      linhas,
    };
  });
}

/** Quem coordena a carteira hoje, pelo nome; a desativada não tem ninguém. */
export const coordenadoresDa = (carteira: CarteiraDaLista): string[] =>
  carteira.linhas
    .filter((linha) => linha.ativa && linha.coordenadorId !== null)
    .map((linha) => linha.coordenador.nome);

/** A linha da lista: unidade, turno e quem coordena, com os avisos da carteira ativa. */
export function itemDaCarteira(carteira: CarteiraDaLista): ItemDoCadastro {
  const { unidade, ativa, linhas } = carteira;
  const coordenadores = coordenadoresDa(carteira);
  const marcas: MarcaDoItem[] = [];
  if (ativa && linhas.some((linha) => !linha.coordenador.ativo)) {
    marcas.push({ rotulo: 'Coordenação desativada', tom: 'alerta' });
  }
  if (ativa && !unidade.ativa) marcas.push({ rotulo: 'Unidade desativada', tom: 'alerta' });
  return {
    id: carteira.id,
    sigla: unidade.sigla,
    nome: `${unidade.nome} · ${ROTULO_DO_TURNO[carteira.turno]}`,
    detalhe: coordenadores.length === 0 ? SEM_COORDENADOR : coordenadores.join(', '),
    marcas,
    ativo: ativa,
    rotuloDaEdicao: `Editar carteira ${nomeDaCarteira(carteira)}${ativa ? '' : ', desativada'}`,
  };
}

/** As unidades que recebem carteira nova: só as ativas. */
export const opcoesDeUnidade = (unidades: readonly Unidade[]): OpcaoDoSeletor[] =>
  unidades
    .filter((unidade) => unidade.ativa)
    .map(({ id, sigla, nome }) => ({ valor: String(id), rotulo: `${sigla} · ${nome}` }));

/** Turnos em que a unidade já tem carteira ativa. */
export const turnosOcupados = (
  carteiras: readonly Pick<Carteira, 'unidadeId' | 'turno' | 'ativa'>[],
  unidadeId: number,
): ReadonlySet<Turno> =>
  new Set(
    carteiras
      .filter((carteira) => carteira.ativa && carteira.unidadeId === unidadeId)
      .map((carteira) => carteira.turno),
  );

function descricaoDoTurno(ocupados: ReadonlySet<Turno> | null, turno: Turno) {
  if (ocupados === null) return undefined;
  return ocupados.has(turno) ? 'Já tem carteira ativa.' : 'Livre nesta unidade.';
}

/** Os turnos em cartões; escolhida a unidade, o que já tem carteira ativa não se escolhe. */
export const opcoesDeTurno = (ocupados: ReadonlySet<Turno> | null): OpcaoEmCartao[] =>
  TURNOS.map((turno) => ({
    valor: turno,
    rotulo: ROTULO_DO_TURNO[turno],
    descricao: descricaoDoTurno(ocupados, turno),
    indisponivel: ocupados?.has(turno) === true,
  }));

/** Quem mais coordena a carteira, para a pessoa saber com quem divide o turno. */
function companhiaNa(carteira: CarteiraDaLista, pessoaId: number | undefined) {
  const outros = carteira.linhas
    .filter((linha) => linha.coordenadorId !== null && linha.coordenadorId !== pessoaId)
    .map((linha) => linha.coordenador.nome);
  return outros.length === 0 ? SEM_COORDENADOR : `Também com ${outros.join(', ')}`;
}

/** As carteiras da pessoa hoje, pela chave de unidade e turno. */
export const carteirasDaPessoa = (carteiras: readonly Carteira[], pessoaId: number): string[] =>
  carteiras
    .filter((carteira) => carteira.ativa && carteira.coordenadorId === pessoaId)
    .map(chaveDaCarteira);

/**
 * As carteiras que a pessoa pode coordenar: as ativas de unidade ativa e as que ela já tem. Cada
 * uma diz quem mais está nela: o turno pode ter mais de um coordenador.
 */
export function opcoesDeCarteiraDaPessoa(
  carteiras: readonly CarteiraNaTela[],
  pessoaId?: number,
): OpcaoEmCartao[] {
  const jaTem = new Set(pessoaId === undefined ? [] : carteirasDaPessoa(carteiras, pessoaId));
  return agruparCarteiras(carteiras)
    .filter(
      (carteira) =>
        carteira.ativa && (carteira.unidade.ativa || jaTem.has(chaveDaCarteira(carteira))),
    )
    .map((carteira) => ({
      valor: chaveDaCarteira(carteira),
      rotulo: `${carteira.unidade.sigla} · ${carteira.unidade.nome} · ${ROTULO_DO_TURNO[carteira.turno]}`,
      descricao: companhiaNa(carteira, pessoaId),
    }));
}

/**
 * O que muda no banco para a pessoa ficar com as carteiras escolhidas. Ao sair: sozinha na
 * carteira, a linha fica sem coordenador (a carteira e os assistidos seguem); com outra pessoa no
 * mesmo turno, a linha dela é desativada (o banco recusa se ainda tiver assistidos ativos). Ao
 * entrar: preenche a linha sem coordenador ou, se o turno já tem alguém, ganha uma linha nova.
 */
export function planoDeAtribuicao(
  carteiras: readonly Carteira[],
  pessoaId: number,
  escolhidas: readonly string[],
): PassoDaAtribuicao[] {
  const ativas = carteiras.filter((carteira) => carteira.ativa);
  const minhas = ativas.filter((carteira) => carteira.coordenadorId === pessoaId);
  const passos: PassoDaAtribuicao[] = [];
  for (const minha of minhas) {
    const chave = chaveDaCarteira(minha);
    if (escolhidas.includes(chave)) continue;
    const sozinha = !ativas.some((c) => c.id !== minha.id && chaveDaCarteira(c) === chave);
    const valores = sozinha
      ? { coordenadorId: null, ativa: true }
      : { coordenadorId: pessoaId, ativa: false };
    passos.push({ tipo: 'alterar', id: minha.id, valores });
  }
  for (const chave of escolhidas) {
    if (minhas.some((minha) => chaveDaCarteira(minha) === chave)) continue;
    const vazia = ativas.find((c) => c.coordenadorId === null && chaveDaCarteira(c) === chave);
    const modelo = ativas.find((c) => chaveDaCarteira(c) === chave);
    if (vazia !== undefined) {
      passos.push({
        tipo: 'alterar',
        id: vazia.id,
        valores: { coordenadorId: pessoaId, ativa: true },
      });
    } else if (modelo !== undefined) {
      const { unidadeId, turno } = modelo;
      passos.push({ tipo: 'cadastrar', valores: { unidadeId, turno, coordenadorId: pessoaId } });
    }
  }
  return passos;
}

/**
 * Desativar a carteira desativa a linha de cada coordenador; reativar traz a última de volta, sem
 * coordenador (quem coordena entra de novo pelo cadastro da pessoa).
 */
export function passosDaSituacao(carteira: CarteiraDaLista, ativa: boolean): PassoDaAtribuicao[] {
  if (ativa === carteira.ativa) return [];
  if (!ativa) {
    return carteira.linhas.map((linha) => ({
      tipo: 'alterar',
      id: linha.id,
      valores: { coordenadorId: linha.coordenadorId, ativa: false },
    }));
  }
  const ultima = carteira.linhas.at(-1);
  return ultima === undefined
    ? []
    : [{ tipo: 'alterar', id: ultima.id, valores: { coordenadorId: null, ativa: true } }];
}
