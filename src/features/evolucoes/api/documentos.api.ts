import { z } from 'zod';

import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import {
  type DocumentoConferido,
  TIPOS_DE_DOCUMENTO,
  type TipoDeDocumento,
} from '@dominio/documentos.ts';

/**
 * Os outros documentos da evolução (E25), em `evolucao.documentos`: o texto lido, já sem o nome do
 * assistido; o arquivo não é guardado. Tirar da lista é desmarcar `ativo`. Quem pode o quê e o que
 * é recusado são do banco; aqui só se traduzem as recusas.
 */
export interface Documento {
  id: number;
  arquivo: string;
  tipo: TipoDeDocumento;
  data: string | null;
  paginas: number | null;
  texto: string;
  trocas: number;
  confirmado: boolean;
}

const TIPOS = Object.keys(TIPOS_DE_DOCUMENTO) as [TipoDeDocumento, ...TipoDeDocumento[]];

const esquemaDocumento = z
  .object({
    id: z.number().int(),
    arquivo_nome: z.string(),
    tipo: z.enum(TIPOS),
    data_documento: z.string().nullable(),
    paginas: z.number().int().nullable(),
    texto: z.string(),
    trocas: z.number().int(),
    confirmado: z.boolean(),
  })
  .transform((d): Documento => ({
    id: d.id,
    arquivo: d.arquivo_nome,
    tipo: d.tipo,
    data: d.data_documento,
    paginas: d.paginas,
    texto: d.texto,
    trocas: d.trocas,
    confirmado: d.confirmado,
  }));

const MENSAGENS: MensagensDoBanco = {
  sem_permissao: 'Só o coordenador da carteira junta e altera os documentos.',
  indisponivel: 'Não foi possível gravar o documento agora. Tente de novo em instantes.',
  regras: {
    evolucao_fechada: 'A evolução não está em conferência. Reabra antes de mudar os documentos.',
    documentos_demais: 'A evolução já tem 8 documentos. Tire um da lista antes de juntar outro.',
    documento_data_futura: 'A data do documento está no futuro.',
  },
};

/** Os documentos que seguem na lista da evolução, na ordem em que entraram. */
export async function buscarDocumentos(evolucaoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('documentos')
    .select('id, arquivo_nome, tipo, data_documento, paginas, texto, trocas, confirmado')
    .eq('evolucao_id', evolucaoId)
    .eq('ativo', true)
    .order('id');
  if (error !== null) {
    throw erroDoBanco(error, {
      indisponivel: 'Não foi possível carregar os documentos agora. Tente de novo em instantes.',
    });
  }
  return z.array(esquemaDocumento).parse(data);
}

/** Grava o documento lido; sem o nome no texto, só com a confirmação do coordenador. */
export async function juntarDocumento(
  evolucaoId: string,
  documento: DocumentoConferido,
  confirmado: boolean,
): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('documentos')
    .insert({
      evolucao_id: evolucaoId,
      arquivo_nome: documento.arquivo.slice(0, 200),
      tipo: documento.tipoSugerido,
      data_documento: documento.dataSugerida,
      paginas: documento.paginas,
      texto: documento.texto,
      trocas: documento.trocas,
      confirmado,
    });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}

/** Muda o tipo, a data ou tira o documento da lista. */
export async function alterarDocumento(
  id: number,
  mudanca: { tipo?: TipoDeDocumento; data_documento?: string | null; ativo?: false },
): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('documentos')
    .update(mudanca)
    .eq('id', id);
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}
