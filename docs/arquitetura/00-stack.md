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
| `cadastro` | Unidades, planos de saúde, assistidos, coordenadores (CRP e assinatura) e carteiras por unidade e turno. A decidir se é compartilhado com o sistema de contas médicas (P11). |
| `tita` | Cada importação: o PDF original (Storage privado), os Dados do Favorecido e as análises lidas, com data e falta. Nada se apaga; uma nova importação substitui a anterior sem apagá-la. |
| `evolucao` | Evolução por assistido e competência; as 4 partes com as versões (IA ou coordenador, com a instrução usada), as datas de origem de cada frase e meta, lacunas resolvidas, conferências com ciência, situação, devolução e envio. |
| `config` | Termos inadequados e substitutos (P12), limites (linhas mínimas, semelhança, frequência) e a frase padrão das metas. |
| `acesso` | Usuários e papéis. O RLS limita o coordenador à carteira dele e contas médicas às evoluções enviadas. |
| `auditoria` | Trilha de quem fez o quê e quando (o "Histórico" do protótipo). |

**Domínio puro** (`supabase/functions/_shared/dominio/`, TypeScript sem Deno nem Node, testado à parte): leitura do texto do Tita, com os blocos, as faltas e as quebras de página (E02–E04); pseudonimização e volta do nome (E05); conferências das 4 partes (E09–E12); semelhança com o mês anterior (n-gramas); código da evolução (E16) e prazo (E15). O mesmo código roda no navegador e nas Edge Functions.

**Edge Functions** (proposta):

| Função | O que faz |
|---|---|
| `importar-tita` | Recebe o PDF, extrai o texto no servidor, confere favorecido, período, terapia e filtro (E03) e grava as análises. |
| `gerar-rascunho` | Chama a API da OpenAI só pelo servidor (P10), com o texto pseudonimizado, a evolução do mês anterior e as metas. Pede saída estruturada (JSON validado por zod) com as 4 partes, as datas de origem e as lacunas. Também gera uma parte de novo com instrução. |
| `concluir-evolucao`, `devolver-evolucao`, `enviar-evolucao` | As transições de E13, validadas no servidor: só conclui sem bloqueio; envio exige assinatura (E14). |
| `emitir-docx` | Gera o Word do modelo (Cambria 12, espaçamento 1,5), individual e arquivo do mês, com o nome de volta e a assinatura. |

**Rotas do front** seguem as telas do protótipo, listadas em [`../escopo/01-dominio.md`](../escopo/01-dominio.md#6-telas-do-protótipo).
