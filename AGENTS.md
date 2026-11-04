# AGENTS.md

Este repositório segue o padrão obrigatório em `ENGINEERING_STANDARDS.md`. Leia-o antes de escrever ou alterar código. Toda regra marcada **MUST** bloqueia o merge; exceção exige ADR em `docs/adr/`.

## Fase atual: protótipo

Só existe o protótipo (`prototipo/evolucao-aba.html`, HTML, CSS e JavaScript num arquivo, sem build). Para abrir:

```bash
python -m http.server 4174 --bind 127.0.0.1 --directory prototipo   # http://localhost:4174/evolucao-aba.html
```

- Dados fictícios, gerados de forma determinística no próprio arquivo (`BASE`, `SPEC`, `criarAssistido`). Mudar o gerador muda todos os números: conferir de novo o roteiro do README.
- Cada regra do domínio tem um número (E01…) em `docs/escopo/01-dominio.md`, citado nos comentários do código. Regra nova ou alterada entra primeiro no documento.
- Antes de entregar uma mudança no protótipo: abrir no navegador, percorrer o roteiro do README nos três perfis, olhar o console e testar em 375 px de largura.

## Comandos (a partir da F0)

```bash
pnpm install --frozen-lockfile           # nunca npm install
supabase start && supabase db reset      # Postgres local + schemas declarativos + seed fictício
pnpm dev                                 # Vite
pnpm typecheck                           # tsc --noEmit (strict) + deno check supabase/functions
pnpm lint                                # ESLint --max-warnings 0 + Prettier + deno lint
pnpm test                                # Vitest + RTL + MSW
pnpm test:dominio                        # deno test --coverage supabase/functions/_shared/dominio
pnpm test:db                             # supabase test db (pgTAP: RLS, constraints, transições)
pnpm test:e2e                            # Playwright contra o Supabase local
pnpm gen:types                           # supabase gen types --local > src/types/database.types.ts
pnpm build
```

## Regras que o código não deixa óbvias

- Estrutura feature-based: `features/*` nunca importa outra feature nem `app/`; `components|hooks|lib|utils|types|config` nunca importam `features/` ou `app/`; só `features/*/api` importa `@/lib/supabase`.
- `@dominio` e `@contratos` (`supabase/functions/_shared/`) são TypeScript puro: sem APIs de Deno ou Node, imports relativos com `.ts`, nunca importam `src/`. O cálculo da evolução (independência, aquisição, alertas, pendências) fica só ali; o front e as Edge Functions usam o mesmo código.
- Estado de servidor vive só no TanStack Query v5. Nunca copiar `data` para `useState`, Context ou Zustand.
- Banco: tentativa registrada não se apaga nem se sobrescreve; correção é um registro novo que aponta para o original (E14). Evolução enviada ou aprovada é só leitura; devolução cria versão nova (E10).
- Sem `console.*` fora de `src/lib/logger.ts` e `_shared/log.ts`. Nunca logar nome, data de nascimento, convênio ou texto clínico.
- Dados sensíveis: nenhum nome de pessoa real em código, seed, fixture, documento ou log; `arquivos/` e `SENHAS.txt` ficam fora do git e não são lidos; fixtures só anonimizadas em `__fixtures__/`.
- Mobile-first; alvo de toque ≥ 24×24 px (no registro de sessão, bem maior); inputs com `text-base` no mobile; `min-h-dvh`, nunca `h-screen`.

## PR

- Branch vive ≤ 2 dias; squash merge; título em Conventional Commits; ≤ 400 linhas por review.
- Toda mudança de lógica traz teste no mesmo PR.
- Atualizar README, ADR, `docs/escopo/` e este arquivo quando comportamento ou comandos mudarem.
