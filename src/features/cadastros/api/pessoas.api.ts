import { z } from 'zod';

import type { Papel } from '@/hooks/useUsuario';
import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * Pessoas que usam o sistema (`acesso.usuarios`). Só a coordenação geral lê todas, cadastra e
 * altera (RLS). A conta de acesso é do Supabase Auth e se liga à pessoa pelo e-mail confirmado:
 * a tela só sabe se ela já existe (`temConta`), nunca o id da conta.
 */
export interface Pessoa {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  /** Só a coordenação de unidade tem: vai na assinatura do arquivo do mês. */
  crp: string | null;
  ativo: boolean;
  temConta: boolean;
}

export type DadosDaPessoa = Omit<Pessoa, 'id' | 'temConta'>;

const COLUNAS = 'id, nome, email, papel, crp, ativo, auth_user_id';

const esquemaPessoa = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    email: z.string(),
    papel: z.enum(['coordenador', 'coordenacao_geral', 'contas_medicas']),
    crp: z.string().nullable(),
    ativo: z.boolean(),
    auth_user_id: z.string().nullable(),
  })
  .transform(({ auth_user_id: conta, ...pessoa }): Pessoa => ({
    ...pessoa,
    temConta: conta !== null,
  }));

const MENSAGENS = {
  duplicado: 'Já existe uma pessoa com este e-mail.',
  sem_permissao: 'Só a coordenação geral cadastra e altera pessoas.',
  regras: {
    ultima_coordenacao_geral:
      'O sistema precisa de ao menos uma coordenação geral ativa. Cadastre outra antes desta mudança.',
    email_com_conta:
      'Esta pessoa já tem conta e entra com este e-mail. Ele não muda pelo cadastro.',
    coordenador_com_carteira:
      'Esta pessoa tem carteira ativa. Passe a carteira para outro coordenador antes de mudar o papel.',
  },
};

export async function buscarPessoas(): Promise<Pessoa[]> {
  const { data, error } = await supabase
    .schema('acesso')
    .from('usuarios')
    .select(COLUNAS)
    .order('nome');
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return z.array(esquemaPessoa).parse(data);
}

/** Cadastra (sem `id`) ou altera (com `id`); devolve a pessoa como ficou no banco. */
export async function salvarPessoa(valores: DadosDaPessoa, id?: number): Promise<Pessoa> {
  const de = supabase.schema('acesso').from('usuarios');
  const escrita = id === undefined ? de.insert(valores) : de.update(valores).eq('id', id);
  const { data, error } = await escrita.select(COLUNAS).single();
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
  return esquemaPessoa.parse(data);
}
