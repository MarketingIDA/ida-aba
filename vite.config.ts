import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Os aliases `@/` e `@dominio/` vêm do tsconfig.json: uma fonte só.
  resolve: { tsconfigPaths: true },
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 300 },
});
