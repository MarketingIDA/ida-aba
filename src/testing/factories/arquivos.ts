import type { CarteiraDoMes, EvolucaoDoArquivo } from '@/features/arquivo-do-mes/api/arquivos.api';

/** Carteira fictícia no mês, do coordenador demo e pronta para enviar. Nenhum nome é real. */
export function carteiraDoMes(sobrescrever: Partial<CarteiraDoMes> = {}): CarteiraDoMes {
  return {
    carteiraId: 1,
    unidadeSigla: 'UNA',
    unidadeNome: 'Unidade Fictícia',
    turno: 'manha',
    coordenador: 'Carla Fictícia Coordenadora',
    minha: true,
    assistidos: 3,
    semEvolucao: 0,
    emConferencia: 0,
    concluidas: 3,
    comAssinatura: true,
    arquivo: null,
    ...sobrescrever,
  };
}

/** A carteira como a RPC `evolucao.arquivos_do_mes` devolve (snake_case). */
export function carteiraDaRpc(carteira: CarteiraDoMes) {
  return {
    carteira_id: carteira.carteiraId,
    unidade_sigla: carteira.unidadeSigla,
    unidade_nome: carteira.unidadeNome,
    turno: carteira.turno,
    coordenador: carteira.coordenador,
    minha: carteira.minha,
    assistidos: carteira.assistidos,
    sem_evolucao: carteira.semEvolucao,
    em_conferencia: carteira.emConferencia,
    concluidas: carteira.concluidas,
    com_assinatura: carteira.comAssinatura,
    arquivo_id: carteira.arquivo?.id ?? null,
    enviado_em: carteira.arquivo?.enviadoEm ?? null,
    n_evolucoes: carteira.arquivo?.evolucoes ?? null,
  };
}

/** A evolução como a RPC `evolucao.evolucoes_do_arquivo` devolve. */
export function evolucaoDaRpc(evolucao: EvolucaoDoArquivo) {
  return {
    evolucao_id: evolucao.id,
    codigo: evolucao.codigo,
    assistido: evolucao.assistido,
    plano: evolucao.plano,
  };
}
