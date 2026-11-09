import { expect, test as base } from '@playwright/test';

const CHAVE = 'violacoes-csp';

/**
 * O `test` do E2E: reprova o teste se a CSP bloquear qualquer coisa. O `vite preview` manda a mesma
 * CSP do vercel.json (ver vite.config.ts), então o que passa aqui passa na produção.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // A sessionStorage sobrevive aos `goto` da mesma origem; a página nova anota no mesmo lugar.
    await page.addInitScript((chave) => {
      document.addEventListener('securitypolicyviolation', (evento) => {
        const anterior = sessionStorage.getItem(chave) ?? '';
        sessionStorage.setItem(
          chave,
          `${anterior}${evento.effectiveDirective} ${evento.blockedURI}\n`,
        );
      });
    }, CHAVE);
    await use(page);
    const violacoes = await page.evaluate((chave) => sessionStorage.getItem(chave), CHAVE);
    expect(violacoes, 'a CSP bloqueou algo').toBeNull();
  },
});

export { expect };
