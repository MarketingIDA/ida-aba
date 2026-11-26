import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';
import { type Turno, TURNOS } from '@/utils/turno';
import { type Trechos, TRECHOS_VAZIOS } from '@dominio/evolucao.ts';

/**
 * O que o PDF do arquivo do mês leva (E14). O arquivo enviado vem com quem assinou e a assinatura
 * da época; sem envio, vem a prévia, com as evoluções já concluídas. Quem lê o quê é do banco.
 */
export interface EvolucaoDoArquivo {
  codigo: string;
  assistido: string;
  plano: string | null;
  texto: Trechos;
  metasAlcancadas: string[];
  metasDoMes: string[];
}

export interface ConteudoDoArquivo {
  unidade: string;
  unidadeSigla: string;
  turno: Turno;
  mesRef: string;
  /** `null` na prévia: o arquivo ainda não foi a contas médicas. */
  enviadoEm: string | null;
  coordenador: string | null;
  crp: string | null;
  /** O caminho da imagem no bucket `assinaturas`. */
  assinatura: string | null;
  evolucoes: EvolucaoDoArquivo[];
  /**
   * A evolução de um assistido, baixada só para conferência (E14): sai com o aviso e sem a
   * assinatura, porque não vai a contas médicas.
   */
  conferencia?: boolean;
}

const esquemaMetas = z
  .array(z.string())
  .nullable()
  .transform((metas) => metas ?? []);

const esquemaEvolucao = z
  .object({
    codigo: z.string(),
    assistido: z.string(),
    plano: z.string().nullable(),
    texto: z
      .object({
        abertura: z.string(),
        programas: z.string(),
        comportamentos: z.string(),
        recursos: z.string(),
        fechamento: z.string(),
      })
      .nullable(),
    metas_alcancadas: esquemaMetas,
    metas_do_mes: esquemaMetas,
  })
  .transform((e): EvolucaoDoArquivo => ({
    codigo: e.codigo,
    assistido: e.assistido,
    plano: e.plano,
    texto: e.texto ?? TRECHOS_VAZIOS,
    metasAlcancadas: e.metas_alcancadas,
    metasDoMes: e.metas_do_mes,
  }));

const esquemaConteudo = z
  .object({
    unidade: z.string(),
    unidade_sigla: z.string(),
    turno: z.enum(TURNOS),
    mes_ref: z.string(),
    enviado_em: z.string().nullable(),
    coordenador: z.string().nullable(),
    crp: z.string().nullable(),
    assinatura: z.string().nullable(),
    evolucoes: z.array(esquemaEvolucao),
  })
  .transform((c): ConteudoDoArquivo => ({
    unidade: c.unidade,
    unidadeSigla: c.unidade_sigla,
    turno: c.turno,
    mesRef: c.mes_ref,
    enviadoEm: c.enviado_em,
    coordenador: c.coordenador,
    crp: c.crp,
    assinatura: c.assinatura,
    // Ordem alfabética (E14), sem depender da ordenação do banco para os acentos.
    evolucoes: c.evolucoes.toSorted((a, b) => a.assistido.localeCompare(b.assistido, 'pt-BR')),
  }));

const INDISPONIVEL = 'Não foi possível montar o PDF agora. Tente de novo em instantes.';

/** O conteúdo do arquivo de uma carteira no mês; o banco devolve `null` a quem não pode ler. */
export async function buscarConteudoDoArquivo(
  carteiraId: number,
  mesRef: string,
): Promise<ConteudoDoArquivo> {
  const resposta = await supabase
    .schema('evolucao')
    .rpc('conteudo_do_arquivo', { p_carteira: carteiraId, p_mes: mesRef });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, { indisponivel: INDISPONIVEL });
  }
  if (resposta.data === null) {
    throw new ErroApp('sem_permissao', 'Você não tem acesso a este arquivo.');
  }
  return esquemaConteudo.parse(resposta.data);
}

/** A imagem da assinatura que vai no fim do PDF. */
export async function baixarAssinatura(caminho: string): Promise<Blob> {
  const download = await supabase.storage.from('assinaturas').download(caminho);
  if (download.error !== null) {
    throw new ErroApp(
      'indisponivel',
      'Não foi possível carregar a assinatura do arquivo. Tente de novo em instantes.',
      download.error,
    );
  }
  return download.data;
}
