import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra o build de produção, com o Supabase respondido pelo próprio teste
 * (`tests/e2e/apoio/supabaseFicticio.ts`): nada vai para o banco real.
 * Local sem baixar navegadores: `PLAYWRIGHT_CHANNEL=msedge pnpm test:e2e --project=desktop`.
 */
const porta = '4175';
const ci = Boolean(process.env.CI);
const canal = process.env.PLAYWRIGHT_CHANNEL;

// Valores de teste, sem segredo: o app valida as variáveis públicas no boot.
const ambiente = {
  VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_teste',
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  reporter: ci ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${porta}`,
    trace: 'on-first-retry',
    ...(canal ? { channel: canal } : {}),
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${porta} --strictPort`,
    url: `http://127.0.0.1:${porta}`,
    reuseExistingServer: !ci,
    timeout: 120_000,
    env: ambiente,
  },
});
