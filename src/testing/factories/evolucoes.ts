import type {
  Coordenador,
  LinhaDoMes,
  SituacaoDaEvolucao,
} from '@/features/evolucoes/api/evolucoes.api';

/** Mês da evolução dos testes (a data de hoje fica em 04/11/2026). */
export const MES_DEMO = '2026-11-01';

interface Opcoes extends Partial<Omit<LinhaDoMes, 'evolucao'>> {
  situacao?: SituacaoDaEvolucao | null;
  partesConferidas?: number;
}

/** Linha fictícia da carteira. Nenhum nome aqui é de pessoa real. */
export function linhaDoMes({
  situacao = null,
  partesConferidas = 0,
  ...sobrescrever
}: Opcoes = {}): LinhaDoMes {
  const linha: LinhaDoMes = {
    assistidoId: 1,
    nome: 'Assistido Fictício',
    plano: 'Plano Fictício',
    unidadeSigla: 'UNA',
    unidadeNome: 'Unidade Fictícia',
    turno: 'manha',
    coordenadorId: 2,
    evolucao: null,
    ...sobrescrever,
  };
  if (situacao === null) return linha;
  const sequencia = String(linha.assistidoId).padStart(3, '0');
  return {
    ...linha,
    evolucao: {
      id: `00000000-0000-4000-8000-${String(linha.assistidoId).padStart(12, '0')}`,
      codigo: `${linha.unidadeSigla}-2611-${sequencia}-EV`,
      situacao,
      origem: 'tita',
      partesConferidas,
    },
  };
}

/** A linha como a RPC `evolucao.evolucoes_do_mes` devolve (snake_case). */
export function linhaDaRpc(linha: LinhaDoMes) {
  return {
    assistido_id: linha.assistidoId,
    nome: linha.nome,
    plano: linha.plano,
    unidade_sigla: linha.unidadeSigla,
    unidade_nome: linha.unidadeNome,
    turno: linha.turno,
    coordenador_id: linha.coordenadorId,
    evolucao_id: linha.evolucao?.id ?? null,
    codigo: linha.evolucao?.codigo ?? null,
    situacao: linha.evolucao?.situacao ?? null,
    origem: linha.evolucao?.origem ?? null,
    partes_conferidas: linha.evolucao?.partesConferidas ?? 0,
  };
}

/** Carteira fictícia de uma unidade e um turno, com as quatro situações. */
export function carteiraDemo(): LinhaDoMes[] {
  return [
    linhaDoMes({ assistidoId: 1, nome: 'Alice Fictícia Moura' }),
    linhaDoMes({ assistidoId: 2, nome: 'Bento Fictício Prado', plano: null }),
    linhaDoMes({
      assistidoId: 3,
      nome: 'Cecília Fictícia Rios',
      situacao: 'em_conferencia',
      partesConferidas: 2,
    }),
    linhaDoMes({ assistidoId: 4, nome: 'Davi Fictício Nunes', situacao: 'concluida' }),
    linhaDoMes({ assistidoId: 5, nome: 'Elisa Fictícia Torres', situacao: 'enviada' }),
  ];
}

/** Todas as unidades, como a coordenação geral vê. */
export function unidadesDemo(): LinhaDoMes[] {
  return [
    ...carteiraDemo(),
    linhaDoMes({
      assistidoId: 6,
      nome: 'Fábio Fictício Lopes',
      unidadeSigla: 'UNB',
      unidadeNome: 'Outra Unidade Fictícia',
      turno: 'tarde',
      coordenadorId: 7,
    }),
  ];
}

export function coordenadoresDemo(): Coordenador[] {
  return [
    { id: 2, nome: 'Carla Fictícia Coordenadora' },
    { id: 7, nome: 'Gil Fictício Coordenador' },
  ];
}
