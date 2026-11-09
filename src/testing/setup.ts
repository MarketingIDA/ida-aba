import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from '@/testing/server';

// O jsdom não rola a página: a rolagem até a lista (card que leva à lista) vira nada.
Element.prototype.scrollIntoView = () => undefined;

// Requisição sem handler derruba o teste: nada vai para a rede de verdade.
beforeAll(() => {
  // MSW 3: `onUnhandledFrame` substitui o antigo `onUnhandledRequest`.
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  // A sessão do supabase-js vive no localStorage: nenhum teste herda o login do anterior.
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
