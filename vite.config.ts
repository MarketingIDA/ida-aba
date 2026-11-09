import { readFileSync } from 'node:fs';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { z } from 'zod';

const SUPABASE = '.supabase.co';

const esquemaVercel = z.object({
  headers: z.array(
    z.object({
      source: z.string(),
      headers: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
});

/**
 * Os cabeçalhos de segurança do vercel.json, para o `vite preview` (a base do E2E) rodar sob a
 * mesma CSP da produção. Só o Supabase do `connect-src` vira o do build (o fictício, no E2E).
 */
function cabecalhosDaVercel(supabaseUrl: string | undefined): Record<string, string> {
  const { headers } = esquemaVercel.parse(JSON.parse(readFileSync('vercel.json', 'utf8')));
  const geral = headers.find((regra) => regra.source === '/(.*)')?.headers ?? [];
  const saida = Object.fromEntries(geral.map(({ key, value }) => [key, value]));
  const csp = saida['Content-Security-Policy'];
  const fim = (csp?.indexOf(SUPABASE) ?? -1) + SUPABASE.length;
  if (supabaseUrl !== undefined && csp !== undefined && fim > SUPABASE.length) {
    const producao = csp.slice(csp.lastIndexOf('//', fim) + 2, fim);
    saida['Content-Security-Policy'] = csp.replaceAll(producao, new URL(supabaseUrl).host);
  }
  return saida;
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Os aliases `@/` e `@dominio/` vêm do tsconfig.json: uma fonte só.
  resolve: { tsconfigPaths: true },
  server: { port: 5173, strictPort: true },
  preview: { headers: cabecalhosDaVercel(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL) },
  build: { chunkSizeWarningLimit: 300 },
}));
