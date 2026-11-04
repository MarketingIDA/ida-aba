# 00 · Stack-alvo e encaixe do domínio

Proposta para depois da aprovação do protótipo. A stack é a da casa, a mesma do sistema de contas médicas, e segue o [`ENGINEERING_STANDARDS.md`](../../ENGINEERING_STANDARDS.md). As versões exatas ficam fixadas no `package.json` na F0.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19 + Vite 8 (Rolldown) + TypeScript 7, Tailwind CSS 4 (configuração em CSS) e shadcn/ui sobre Base UI |
| Dados e estado | TanStack Query 5 + Context (AuthProvider) |
| Rotas | React Router 8 em modo biblioteca |
| Formulários | react-hook-form 7 + zod 4 |
| Backend | Supabase: Postgres + RLS + Edge Functions em Deno 2 |
| Testes | Vitest + Testing Library + MSW; Playwright (celular, tablet e desktop); pgTAP no banco |
| Ferramentas | Node.js 26 + pnpm |

## Como o domínio se encaixa (proposta)

**Schemas do Postgres**

| Schema | O que guarda |
|---|---|
| `cadastro` | Unidades, convênios, crianças, equipe (aplicadores, supervisores, coordenação) e carteiras. A decidir se é compartilhado com o sistema de contas médicas (P11). |
| `pei` | Biblioteca de programas e alvos; PEI de cada criança, com versões; comportamentos-alvo com definição operacional; avaliações (VB-MAPP). |
| `sessao` | Agenda, sessões (realizada, falta, sem aplicação), tentativas por programa, ocorrências por comportamento, anexos e correções (E14). Nada se apaga. |
| `evolucao` | Evolução por criança e competência, versões, pendências resolvidas, análise, orientações, plano do mês seguinte, aprovação e entrega. |
| `acesso` | Usuários e papéis; o RLS limita o aplicador às sessões dele e o supervisor à carteira. |
| `auditoria` | Trilha de quem fez o quê e quando (o "Histórico" do protótipo). |

**Domínio puro** (`supabase/functions/_shared/dominio/`, TypeScript sem Deno nem Node, testado à parte): independência do mês (E02), aquisição (E03), sem progresso e regressão (E04, E05), taxa de comportamento (E06), pendências e bloqueios (E07–E09, E12, E13), código da evolução (E15). O mesmo código roda no navegador e nas Edge Functions.

**Edge Functions** (proposta): `abrir-evolucoes` (dia 1, fecha os números do mês anterior), `enviar-evolucao`, `revisar-evolucao` (aprovar ou devolver), `gerar-relatorio` (PDF do relatório aprovado), `registrar-sessao` (idempotente, aceita envio atrasado quando o celular estava sem internet).

**Rotas do front** seguem as telas do protótipo, listadas em [`../escopo/01-dominio.md`](../escopo/01-dominio.md#6-telas-do-protótipo).
