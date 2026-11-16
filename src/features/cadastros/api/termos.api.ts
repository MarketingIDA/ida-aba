import { z } from 'zod';

import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * A lista de termos inadequados (E10, P12): a palavra que expõe o assistido e o termo técnico que
 * a substitui na evolução. Só a coordenação geral cadastra e altera (RLS). Nada se apaga: o termo
 * que sai da lista fica desativado.
 */
export interface TermoInadequado {
  id: number;
  termo: string;
  substituto: string;
  ativo: boolean;
}

export type DadosDoTermo = Omit<TermoInadequado, 'id'>;

const COLUNAS = 'id, termo, substituto, ativo';

const esquemaTermo = z.object({
  id: z.number().int(),
  termo: z.string(),
  substituto: z.string(),
  ativo: z.boolean(),
});

const MENSAGENS: MensagensDoBanco = {
  duplicado: 'Este termo já está na lista.',
  sem_permissao: 'Só a coordenação geral mantém a lista de termos.',
  regra_violada: 'Confira o termo (2 a 60 letras) e o substituto (2 a 120 letras).',
};

export async function buscarTermos(): Promise<TermoInadequado[]> {
  const { data, error } = await supabase
    .schema('cadastro')
    .from('termos_inadequados')
    .select(COLUNAS)
    .order('termo');
  if (error !== null) throw erroDoBanco(error);
  return z.array(esquemaTermo).parse(data);
}

/** Cadastra (sem `id`) ou altera (com `id`); devolve o termo como ficou no banco. */
export async function salvarTermo(dados: DadosDoTermo, id?: number): Promise<TermoInadequado> {
  const de = supabase.schema('cadastro').from('termos_inadequados');
  const escrita = id === undefined ? de.insert(dados) : de.update(dados).eq('id', id);
  const { data, error } = await escrita.select(COLUNAS).single();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return esquemaTermo.parse(data);
}
