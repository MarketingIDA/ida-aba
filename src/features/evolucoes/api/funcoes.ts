import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';

const esquemaDaRecusa = z.object({ codigo: z.string(), mensagem: z.string() });

/**
 * Chama uma Edge Function da evolução com o login de quem está na tela. A recusa da função vem com
 * um código e a mensagem já em português; qualquer outra falha vira `indisponivel`.
 */
export async function chamarFuncaoDaEvolucao(
  nome: string,
  evolucaoId: string,
  indisponivel: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const resposta = await supabase.functions.invoke<unknown>(nome, {
    body: { ...extra, evolucao_id: evolucaoId },
  });
  const erro: unknown = resposta.error;
  if (erro === null) return;
  if (erro instanceof FunctionsHttpError && erro.context instanceof Response) {
    const corpo: unknown = await erro.context.json().catch(() => null);
    const recusa = esquemaDaRecusa.safeParse(corpo);
    if (recusa.success) throw new ErroApp(recusa.data.codigo, recusa.data.mensagem, erro);
  }
  throw new ErroApp('indisponivel', indisponivel, erro);
}
