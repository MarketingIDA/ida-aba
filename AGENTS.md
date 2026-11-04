# AGENTS.md

Este repositório segue o padrão obrigatório em `ENGINEERING_STANDARDS.md`. Leia-o antes de escrever ou alterar código. Toda regra marcada **MUST** bloqueia o merge; exceção exige ADR em `docs/adr/`.

## Fase atual: protótipo

Só existe o protótipo (`prototipo/evolucao-aba.html`, HTML, CSS e JavaScript num arquivo, sem build). Para abrir:

```bash
python -m http.server 4174 --bind 127.0.0.1 --directory prototipo   # http://localhost:4174/evolucao-aba.html
```

- Dados fictícios, gerados de forma determinística no próprio arquivo (`COORDS`, `NOMES_K1`, `criarAssistido`, `THEO_SESSOES`, `iniciar`). Mudar o gerador muda os casos da demonstração: conferir de novo o roteiro do README.
- A IA é simulada (`gerarRascunho`, `THEO_RASCUNHO`) e o PDF escolhido não é lido; a importação usa os arquivos de exemplo. As conferências automáticas ficam em `conferencias(E)`.
- Cada regra do domínio tem um número (E01…) em `docs/escopo/01-dominio.md`, citado nos comentários do código. Regra nova ou alterada entra primeiro no documento.
- Antes de entregar uma mudança no protótipo: abrir no navegador, percorrer o roteiro do README nos três perfis (coordenador, coordenação geral, contas médicas), olhar o console e testar em 375 px de largura.

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
- `@dominio` e `@contratos` (`supabase/functions/_shared/`) são TypeScript puro: sem APIs de Deno ou Node, imports relativos com `.ts`, nunca importam `src/`. A leitura do texto do Tita (E02–E04), a pseudonimização (E05), as conferências (E09–E12), a semelhança de textos e o código da evolução (E16) ficam só ali; o front e as Edge Functions usam o mesmo código.
- Estado de servidor vive só no TanStack Query v5. Nunca copiar `data` para `useState`, Context ou Zustand.
- Banco: o texto da IA nunca se apaga nem se sobrescreve; cada edição ou "gerar de novo" é uma versão nova da parte, com quem, quando e a instrução (E07). Evolução enviada é só leitura; devolução registra o motivo e volta a evolução para conferência (E13).
- IA: chamada só pela Edge Function, nunca do navegador. O texto vai pseudonimizado (sem nome, plano ou CRP) e a resposta é JSON validado por zod, com as datas de origem de cada frase (E05, E06). O que a IA não acha vira lacuna, nunca texto inventado.
- Sem `console.*` fora de `src/lib/logger.ts` e `_shared/log.ts`. Nunca logar nome, data de nascimento, plano de saúde, texto das análises ou do rascunho.
- Dados sensíveis: nenhum nome de pessoa real em código, seed, fixture, documento ou log; `arquivos/` e `SENHAS.txt` ficam fora do git e não são lidos; fixtures só anonimizadas em `__fixtures__/`.
- Mobile-first; alvo de toque ≥ 24×24 px; inputs com `text-base` no mobile; `min-h-dvh`, nunca `h-screen`.

## PR

- Branch vive ≤ 2 dias; squash merge; título em Conventional Commits; ≤ 400 linhas por review.
- Toda mudança de lógica traz teste no mesmo PR.
- Atualizar README, ADR, `docs/escopo/` e este arquivo quando comportamento ou comandos mudarem.
