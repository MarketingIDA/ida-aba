import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';

/**
 * Cliente único do Supabase no navegador, com a chave publicável. Só `features/*\/api` usa este
 * arquivo. A sessão é o JWT do Supabase Auth, persistido pelo próprio supabase-js; quem autoriza
 * cada leitura e escrita é o RLS. Toda consulta usa `.schema('<dominio>')`: os schemas `acesso`,
 * `cadastro` e `evolucao` são expostos na Data API do projeto. Cada camada `api` valida a resposta
 * com Zod.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);
