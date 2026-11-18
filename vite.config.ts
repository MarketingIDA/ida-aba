import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
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

/** Onde o OCR busca o português: o tesseract.js pede `<langPath>/por.traineddata.gz`. */
const IDIOMA_DO_OCR = 'ocr/por.traineddata.gz';

/**
 * O modelo do português para o OCR das fotos (E25), servido pelo próprio site: nada vem de CDN. O
 * nome do arquivo é fixo, porque o tesseract.js monta o endereço a partir da pasta.
 */
function idiomaDoOcr(): Plugin {
  const origem = createRequire(import.meta.url).resolve(
    '@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz',
  );
  return {
    name: 'idioma-do-ocr',
    configureServer(servidor) {
      servidor.middlewares.use(`/${IDIOMA_DO_OCR}`, (_pedido, resposta) => {
        resposta.setHeader('Content-Type', 'application/octet-stream');
        resposta.end(readFileSync(origem));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: IDIOMA_DO_OCR, source: readFileSync(origem) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), idiomaDoOcr()],
  // Os aliases `@/` e `@dominio/` vêm do tsconfig.json: uma fonte só.
  resolve: { tsconfigPaths: true },
  server: { port: 5173, strictPort: true },
  preview: { headers: cabecalhosDaVercel(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL) },
  build: { chunkSizeWarningLimit: 300 },
}));
