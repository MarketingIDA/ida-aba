// Antes do zod validar qualquer coisa (aqui é a primeira, já no import).
import '@/config/zod';

import { z } from 'zod';

/**
 * Único arquivo que lê `import.meta.env`.
 * Valida no boot e falha rápido, listando os NOMES das variáveis com problema
 * (nunca os valores). Só variáveis públicas `VITE_*` entram aqui: service role,
 * senha do banco e OPENAI_API_KEY ficam nos segredos das Edge Functions, fora do git e do bundle.
 */
const esquema = z.strictObject({
  SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof esquema>;

/** @public Usada pelos testes; o app usa só `env`. */
export function lerEnv(bruto: Record<string, unknown>): Env {
  const resultado = esquema.safeParse({
    SUPABASE_URL: bruto.VITE_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: bruto.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!resultado.success) {
    const nomes = [...new Set(resultado.error.issues.map((i) => `VITE_${String(i.path[0])}`))];
    throw new Error(
      `Configuração incompleta: confira ${nomes.join(', ')} (copie .env.example para .env.local).`,
    );
  }
  return resultado.data;
}

export const env: Env = lerEnv(import.meta.env);
