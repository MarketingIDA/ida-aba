import type { ConteudoDoArquivo } from '@/features/arquivo-do-mes/api/conteudo.api';
import { gerarPdf } from '@/features/arquivo-do-mes/pdf/gerarPdf';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { TRECHOS_VAZIOS } from '@dominio/evolucao.ts';

/**
 * A evolução de um assistido em PDF, só para conferência (E14): o mesmo formato do arquivo do
 * mês, com um bloco só, o aviso no topo e sem a assinatura. Não vai a contas médicas.
 */
export function conteudoDaEvolucao(evolucao: Evolucao): ConteudoDoArquivo {
  return {
    unidade: evolucao.unidade,
    unidadeSigla: evolucao.codigo.split('-')[0] ?? '',
    turno: evolucao.turno,
    mesRef: evolucao.mesRef,
    enviadoEm: null,
    coordenador: evolucao.coordenador,
    crp: null,
    assinatura: null,
    conferencia: true,
    evolucoes: [
      {
        codigo: evolucao.codigo,
        assistido: evolucao.assistido,
        plano: evolucao.plano,
        texto: evolucao.texto?.conteudo ?? TRECHOS_VAZIOS,
        metasAlcancadas: evolucao.metasAlcancadas?.conteudo.metas ?? [],
        metasDoMes: evolucao.metasDoMes?.conteudo.metas ?? [],
      },
    ],
  };
}

/** `Evolucao-UNA-2611-001-EV-conferencia.pdf` */
export const nomeDoPdfDaEvolucao = (evolucao: Evolucao) =>
  `Evolucao-${evolucao.codigo}-conferencia.pdf`;

/** Monta o PDF da evolução no navegador. */
export function pdfDaEvolucao(evolucao: Evolucao): Promise<Blob> {
  return gerarPdf(conteudoDaEvolucao(evolucao), null);
}
