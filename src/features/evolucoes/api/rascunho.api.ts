import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';

/**
 * O rascunho pela IA (E06): a Edge Function `gerar-rascunho` lê a importação do Tita, tira o nome
 * do assistido (E05), pede o texto à IA e grava as partes 2 a 4. A chave da IA fica só no
 * servidor. Aqui a tela só pede e traduz a recusa.
 */
const esquemaDaRecusa = z.object({ codigo: z.string(), mensagem: z.string() });

const INDISPONIVEL = 'Não foi possível gerar o rascunho agora. Tente de novo em instantes.';

/** Pede o rascunho das partes 2 a 4; a evolução volta do banco com as versões da IA. */
export async function gerarRascunho(evolucaoId: string): Promise<void> {
  const resposta = await supabase.functions.invoke<unknown>('gerar-rascunho', {
    body: { evolucao_id: evolucaoId },
  });
  const erro: unknown = resposta.error;
  if (erro === null) return;
  if (erro instanceof FunctionsHttpError && erro.context instanceof Response) {
    const corpo: unknown = await erro.context.json().catch(() => null);
    const recusa = esquemaDaRecusa.safeParse(corpo);
    if (recusa.success) throw new ErroApp(recusa.data.codigo, recusa.data.mensagem, erro);
  }
  throw new ErroApp('indisponivel', INDISPONIVEL, erro);
}
