import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { type Turno, TURNOS } from '@/utils/turno';

/**
 * Carteira: os assistidos de um coordenador numa unidade e num turno. Só uma carteira ativa por
 * unidade e turno (índice único do banco). Todo usuário ativo lê; só a coordenação geral cadastra
 * e altera (RLS). Quem coordena a carteira vê os assistidos e as evoluções dela.
 */
export interface Carteira {
  id: number;
  unidadeId: number;
  turno: Turno;
  coordenadorId: number;
  ativa: boolean;
}

export type NovaCarteira = Omit<Carteira, 'id' | 'ativa'>;

/** Na alteração, só a coordenação e o "ativa" mudam: unidade e turno ficam como nasceram. */
export type AlteracaoDaCarteira = Pick<Carteira, 'coordenadorId' | 'ativa'>;

const COLUNAS = 'id, unidade_id, turno, coordenador_id, ativa';

const esquemaCarteira = z
  .object({
    id: z.number().int(),
    unidade_id: z.number().int(),
    turno: z.enum(TURNOS),
    coordenador_id: z.number().int(),
    ativa: z.boolean(),
  })
  .transform(({ unidade_id: unidadeId, coordenador_id: coordenadorId, ...carteira }): Carteira => ({
    ...carteira,
    unidadeId,
    coordenadorId,
  }));

const MENSAGENS = {
  duplicado: 'Esta unidade já tem carteira ativa neste turno. Passe a que existe ou desative-a.',
  // O trigger `conferir_coordenador`: a pessoa escolhida não tem (mais) o papel de coordenador.
  regra_violada: 'A carteira precisa de alguém com o papel de coordenação de unidade.',
  sem_permissao: 'Só a coordenação geral cadastra e altera carteiras.',
};

const tabela = () => supabase.schema('cadastro').from('carteiras');

export async function buscarCarteiras(): Promise<Carteira[]> {
  const { data, error } = await tabela().select(COLUNAS).order('id');
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return z.array(esquemaCarteira).parse(data);
}

export async function cadastrarCarteira(nova: NovaCarteira): Promise<Carteira> {
  const { data, error } = await tabela()
    .insert({ unidade_id: nova.unidadeId, turno: nova.turno, coordenador_id: nova.coordenadorId })
    .select(COLUNAS)
    .single();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return esquemaCarteira.parse(data);
}

/**
 * Manda sempre a coordenação, mesmo sem mudança: o banco confere o papel de novo (o trigger vale
 * para toda escrita da coluna), e uma carteira reativada não volta com quem deixou de coordenar.
 */
export async function alterarCarteira(
  id: number,
  { coordenadorId, ativa }: AlteracaoDaCarteira,
): Promise<Carteira> {
  const { data, error } = await tabela()
    .update({ coordenador_id: coordenadorId, ativa })
    .eq('id', id)
    .select(COLUNAS)
    .single();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return esquemaCarteira.parse(data);
}
