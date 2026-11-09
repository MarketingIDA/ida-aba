import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import { importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import playwright from 'eslint-plugin-playwright';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import pluginQuery from '@tanstack/eslint-plugin-query';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat. `--max-warnings 0` no `pnpm lint`: warning conta como erro. As fronteiras de
 * import (compartilhado → features/app, features → app, domínio → src) ficam em
 * `import-x/no-restricted-paths`.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      // Fora do escopo de lint: documentos reais, protótipo e docs.
      'arquivos/**',
      'prototipo/**',
      'docs/**',
    ],
  },

  js.configs.recommended,
  comments.recommended,

  {
    rules: {
      // `// eslint-disable` só com justificativa na mesma linha.
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      'no-console': 'error',
    },
  },

  // ── Código do app (src e vite.config.ts): estrito, com informação de tipos ──────────────────
  {
    files: [
      'src/**/*.{ts,tsx}',
      'tests/**/*.ts',
      'supabase/functions/_shared/dominio/**/*.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
    ],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      // TanStack Query: exhaustive-deps, no-unstable-deps, prefer-query-options.
      ...pluginQuery.configs['flat/recommended-strict'],
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'import-x': importX,
      'jsx-a11y': jsxA11y,
      sonarjs,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      'sonarjs/cognitive-complexity': ['error', 15],
      // Sem `any`, sem @ts-ignore; @ts-expect-error só com motivo.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // Componente ≤ ~200 linhas e função ≤ ~50: estourou, extraia um hook ou subcomponente.
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      // Alias `@/` é obrigatório; `../../../` é erro.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../../*'],
              message: 'Use o alias @/ no lugar de caminhos relativos profundos.',
            },
          ],
        },
      ],
      // `import.meta.env` só em src/config/env.ts.
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message: 'Só src/config/env.ts lê import.meta.env. Importe `env` de @/config/env.',
        },
        {
          // Query por role/label primeiro; data-testid só com justificativa (eslint-disable com motivo).
          selector: 'CallExpression[callee.property.name=/^(get|find|query)(All)?ByTestId$/]',
          message:
            'Use getByRole/getByLabelText/getByText. getByTestId só com justificativa no eslint-disable.',
        },
        {
          // Mockar só a borda de rede (MSW): nada de vi.mock em React Query, auth ou supabase.
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name='mock'][arguments.0.value=/(react-query|supabase|auth)/i]",
          message:
            'Não use vi.mock em React Query, auth ou supabase: mocke a rede com MSW (server.use).',
        },
      ],
      // Fronteiras: shared → features/app é proibido; features → app é proibido (Bulletproof React).
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: [
                './src/components',
                './src/hooks',
                './src/lib',
                './src/utils',
                './src/types',
                './src/config',
              ],
              from: ['./src/features', './src/app'],
              message: 'Código compartilhado não conhece features nem app.',
            },
            {
              target: './src/features',
              from: './src/app',
              message: 'Features não importam app/; a composição acontece em app/.',
            },
            {
              // O domínio puro roda no navegador e nas Edge Functions: não conhece o app.
              target: './supabase/functions/_shared/dominio',
              from: './src',
              message: 'O domínio puro não importa nada de src/.',
            },
          ],
        },
      ],
    },
  },

  // react-hooks e a regra do React Compiler só valem nos arquivos de componente e hook.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },

  // Único leitor de import.meta.env.
  {
    files: ['src/config/env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Único lugar com console.* no app.
  {
    files: ['src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },

  // Componentes do shadcn: vêm do CLI e só mudam com `// MODIFIED:`; o estilo de props do
  // gerador não é reescrito à mão.
  {
    files: ['src/components/ui/**'],
    rules: { 'sonarjs/prefer-read-only-props': 'off' },
  },

  // ── Testes: describe/it longos são normais; os limites de tamanho valem para código de produto ─
  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'supabase/functions/_shared/dominio/**/*.test.ts',
      'src/testing/**',
      'tests/**',
      'vitest.config.ts',
      'playwright.config.ts',
    ],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off' },
  },
  // Testing Library: queries por role, find* para assíncrono, sem efeito colateral em waitFor...
  {
    files: ['src/**/*.test.{ts,tsx}'],
    extends: [testingLibrary.configs['flat/react']],
  },
  // Playwright: locators por role, asserções web-first e nada de waitForTimeout.
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
    },
  },

  // ── Scripts e ganchos em JavaScript puro (Node) ────────────────────────────────────────────
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
    rules: {
      // Ferramentas de linha de comando escrevem na saída padrão.
      'no-console': 'off',
    },
  },
);
