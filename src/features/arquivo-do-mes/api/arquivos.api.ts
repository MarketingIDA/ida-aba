import { z } from 'zod';

import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { type Turno, TURNOS } from '@/utils/turno';

/**
 * O arquivo do mês (E24): cada carteira envia um a contas médicas, com todas as evoluções dela.
 * Enviar é gravar a carteira; o mês, quem assina e o que bloqueia são do banco (grants, RLS e
 * triggers). Aqui só se traduzem as recusas.
 */
export interface ArquivoEnviado {
  id: number;
  enviadoEm: string;
  evolucoes: number;
}

/** Uma carteira no mês: o andamento das evoluções e o arquivo, se já foi. */
export interface CarteiraDoMes {
  carteiraId: number;
  unidadeSigla: string;
  unidadeNome: string;
  turno: Turno;
  /** Quem enviou; antes do envio, quem coordena (contas médicas não recebe este nome). */
  coordenador: string | null;
  /** A carteira é de quem está na tela: só ele envia. */
  minha: boolean;
  assistidos: number;
  semEvolucao: number;
  emConferencia: number;
  /** Concluídas ou já enviadas. */
  concluidas: number;
  /** `null` para contas médicas, que não lê assinatura fora de arquivo. */
  comAssinatura: boolean | null;
  arquivo: ArquivoEnviado | null;
}

export interface EvolucaoDoArquivo {
  id: string;
  codigo: string;
  assistido: string;
  plano: string | null;
}

const esquemaCarteira = z
  .object({
    carteira_id: z.number().int(),
    unidade_sigla: z.string(),
    unidade_nome: z.string(),
    turno: z.enum(TURNOS),
    coordenador: z.string().nullable(),
    minha: z.boolean(),
    assistidos: z.number().int(),
    sem_evolucao: z.number().int(),
    em_conferencia: z.number().int(),
    concluidas: z.number().int(),
    com_assinatura: z.boolean().nullable(),
    arquivo_id: z.number().int().nullable(),
    enviado_em: z.string().nullable(),
    n_evolucoes: z.number().int().nullable(),
  })
  .transform((c): CarteiraDoMes => ({
    carteiraId: c.carteira_id,
    unidadeSigla: c.unidade_sigla,
    unidadeNome: c.unidade_nome,
    turno: c.turno,
    coordenador: c.coordenador,
    minha: c.minha,
    assistidos: c.assistidos,
    semEvolucao: c.sem_evolucao,
    emConferencia: c.em_conferencia,
    concluidas: c.concluidas,
    comAssinatura: c.com_assinatura,
    arquivo:
      c.arquivo_id === null || c.enviado_em === null
        ? null
        : { id: c.arquivo_id, enviadoEm: c.enviado_em, evolucoes: c.n_evolucoes ?? 0 },
  }));

const esquemaEvolucao = z
  .object({
    evolucao_id: z.string(),
    codigo: z.string(),
    assistido: z.string(),
    plano: z.string().nullable(),
  })
  .transform((e): EvolucaoDoArquivo => ({
    id: e.evolucao_id,
    codigo: e.codigo,
    assistido: e.assistido,
    plano: e.plano,
  }));

const JA_ENVIADO = 'O arquivo deste mês já foi enviado. Atualize a tela.';

const MENSAGENS: MensagensDoBanco = {
  duplicado: JA_ENVIADO,
  sem_permissao: 'Só o coordenador da carteira envia o arquivo do mês.',
  indisponivel: 'Não foi possível enviar agora. Tente de novo em instantes.',
  regras: {
    arquivo_ja_enviado: JA_ENVIADO,
    arquivo_sem_assinatura: 'Cadastre a sua assinatura antes de enviar o arquivo do mês.',
    arquivo_com_pendencia:
      'O arquivo só vai com a carteira toda concluída. Confira as evoluções e envie de novo.',
    arquivo_vazio: 'A carteira não tem evolução concluída para enviar.',
  },
};

const AO_LER = {
  sem_permissao: 'Você não tem acesso aos arquivos deste mês.',
  indisponivel: 'Não foi possível carregar os arquivos agora. Tente de novo em instantes.',
};

/** As carteiras no mês: as de quem coordena, ou todas para a coordenação geral e contas médicas. */
export async function buscarArquivosDoMes(mesRef: string): Promise<CarteiraDoMes[]> {
  const resposta = await supabase.schema('evolucao').rpc('arquivos_do_mes', { p_mes: mesRef });
  if (resposta.error !== null) throw erroDoBanco(resposta.error, AO_LER);
  return z.array(esquemaCarteira).parse(resposta.data);
}

/** As evoluções que um arquivo levou, em ordem alfabética. */
export async function buscarEvolucoesDoArquivo(arquivoId: number): Promise<EvolucaoDoArquivo[]> {
  const resposta = await supabase
    .schema('evolucao')
    .rpc('evolucoes_do_arquivo', { p_arquivo: arquivoId });
  if (resposta.error !== null) throw erroDoBanco(resposta.error, AO_LER);
  return z.array(esquemaEvolucao).parse(resposta.data);
}

/** Envia o arquivo do mês aberto da carteira a contas médicas. Não tem volta. */
export async function enviarArquivo(carteiraId: number): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('arquivos')
    .insert({ carteira_id: carteiraId });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}
