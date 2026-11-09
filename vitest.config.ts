import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Testes de unidade e de componente. As variáveis abaixo são valores de teste, sem segredo:
 * `src/config/env.ts` valida na importação. Toda requisição sem handler do MSW falha o teste.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/dominio/**/*.test.ts'],
    css: false,
    restoreMocks: true,
    env: {
      VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_teste',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'supabase/functions/_shared/dominio/**/*.ts'],
      exclude: [
        '**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/testing/**',
        'src/main.tsx',
        'src/components/ui/**',
      ],
      reporter: ['text', 'lcov'],
      // Mínimos fixos; o domínio puro (regras E15, E16, E18) fica em 100 %.
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
        'supabase/functions/_shared/dominio/**': {
          lines: 100,
          functions: 100,
          statements: 100,
          branches: 100,
        },
      },
    },
  },
});
