# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo. Todo mês, cada coordenador de unidade faz a evolução de cada assistido da sua carteira e, até o dia 10, envia a contas médicas o **arquivo do mês**, com as evoluções da carteira toda. A evolução nasce das evoluções diárias registradas no Tita: o coordenador importa o PDF do assistido e, se quiser, outros documentos (escola, outras terapias, família); uma IA escreve o rascunho no formato do modelo da clínica e o coordenador confere parte por parte e conclui. Sem o PDF, ele escreve o mês à mão e a IA aprimora o texto. Cada assistido tem ainda a evolução das metas em gráfico, a partir do nível de apoio que a IA lê nas análises.

**Fase atual: fundação do sistema.** O sistema roda na stack da casa com o login dos três perfis e a tela Evoluções do mês lendo o banco de produção. A importação do Tita, o rascunho com a IA, a conferência e o arquivo do mês chegam nas próximas etapas; o [protótipo](#protótipo) continua como referência de telas e regras. A evolução de supervisão é outro relatório e fica para uma fase posterior.

## O que já funciona

- **Acesso:** login por e-mail e senha, primeiro acesso (a pessoa cria a senha pelo link do convite) e recuperação de senha. O papel vem do cadastro em `acesso.usuarios`, nunca do token, e conta sem cadastro ativo não entra.
- **Coordenação de unidade e coordenação geral:** Evoluções do mês, com cards por situação que filtram a lista, busca por nome ou código, escolha do mês (o aberto e os 5 anteriores), período analisado e prazo do arquivo do mês. A coordenação geral vê todas as unidades e recorta por unidade e coordenador.
- **Cadastros (coordenação geral):** unidades, planos de saúde, pessoas, carteiras e assistidos, com o cadastro e a alteração numa gaveta lateral. Nada se apaga: o que não vale mais fica desativado. A carteira junta uma unidade, um turno e quem coordena; só pode haver uma carteira ativa por unidade e turno, e passar a carteira para outra pessoa muda quem vê os assistidos e as evoluções dela. O assistido fica numa carteira ativa e leva a unidade dela; o número dele na unidade, que entra no código da evolução, o banco dá sozinho. A lista de assistidos tem busca pelo nome (sem ligar para acento) e filtro por carteira, e avisa quem está sem plano.
  - Cada pessoa tem um papel (coordenação de unidade, coordenação geral ou contas médicas) e, se coordena unidade, o CRP. Quem ainda não entrou aparece como "Sem conta".
  - Desativar corta o acesso na hora. O e-mail trava depois que a pessoa tem conta, e ninguém muda o próprio papel nem se desativa.
- **Contas médicas:** a tela de arquivos recebidos existe, mas fica vazia até a etapa do envio do arquivo do mês.
- **Banco:** RLS em todas as tabelas. O coordenador lê só a própria carteira; a coordenação geral lê tudo e é a única que cadastra; contas médicas não lê evolução solta. O banco nunca fica sem coordenação geral ativa não deixa mudar o papel de quem tem carteira ativa nem desativar carteira com assistidos ativos, e não põe assistido ativo em carteira desativada. Toda alteração fica na auditoria.

## Rodar localmente

Requisitos: Node 24 e pnpm 12.16.1.

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

Preencha `.env.local` com a URL do projeto e a chave publicável (Supabase → Project Settings → API Keys). Depois:

```bash
pnpm dev
```

O app abre em <http://localhost:5173>. No Claude Code, a configuração `app` em `.claude/launch.json` faz o mesmo.

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor local na porta 5173 |
| `pnpm build` | confere os tipos e gera o build de produção em `dist/` |
| `pnpm lint` | ESLint sem nenhum aviso e Prettier |
| `pnpm typecheck` | TypeScript estrito |
| `pnpm test` | Vitest, com a rede respondida pelo MSW |
| `pnpm test:coverage` | o mesmo, com cobertura mínima de 80% (100% no domínio puro) |
| `pnpm test:e2e` | Playwright no build de produção, em celular e desktop, com axe |

Nenhum teste fala com o banco real: o Vitest usa o MSW e o Playwright responde o Supabase dentro do próprio teste, com dados fictícios. O `vite preview` manda os mesmos cabeçalhos do `vercel.json`, então o E2E roda sob a CSP da produção e reprova o teste se ela bloquear algo. Para rodar o E2E sem baixar navegadores, use o Edge instalado: `PLAYWRIGHT_CHANNEL=msedge pnpm test:e2e`.

O CI (`.github/workflows/ci.yml`) roda lint, tipos, testes com cobertura, build, E2E, gitleaks, Semgrep e auditoria de dependências em todo PR. O job `Resultado` reúne todos.

## Variáveis de ambiente

| Variável | Onde fica | O que é |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` e Vercel | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` e Vercel | chave publicável (`sb_publishable_…`). É pública por desenho: quem protege os dados é o RLS |
| `OPENAI_API_KEY` | segredos das Edge Functions do Supabase | chave da IA; nunca vai para o navegador nem para a Vercel (usada a partir da etapa do rascunho) |

A service role e a senha do banco não entram no repositório, no `.env.local` nem na Vercel.

## Banco (Supabase)

- **Schemas:** `acesso` (usuários e papéis), `cadastro` (unidades, planos, carteiras e assistidos), `evolucao` (evoluções e as 4 partes), `auditoria` (histórico de alterações) e `interno` (funções auxiliares, fora da API).
- **Migrações** em `supabase/migrations/`, aplicadas em ordem. Elas só acrescentam: nenhuma apaga coluna ou tabela com dado.
- **Testes do RLS:** `supabase/tests/rls_evolucoes.sql` faz 30 verificações de acesso e de regra. Ele roda numa transação que sempre se desfaz, então pode rodar no SQL Editor de produção sem gravar nada. A saída esperada é `RESULTADO: 0 falhas de 30`.

## Configuração do Supabase (uma vez, no painel)

Estes passos ficam com o dono do projeto e não estão no código:

1. **Data API:** em Project Settings → Data API → Exposed schemas, acrescente `acesso`, `cadastro` e `evolucao`. Sem isso, o app recebe "Invalid schema" e ninguém entra.
2. **Cadastro aberto desligado:** em Authentication → Sign In / Providers, desligue "Allow new users to sign up". Só entra quem for convidado.
3. **URLs:** em Authentication → URL Configuration, use `https://ida-aba.vercel.app/primeiro-acesso` como Site URL, para que o convite caia direto na criação da senha. Em Redirect URLs, ponha `https://ida-aba.vercel.app/primeiro-acesso` e `http://localhost:5173/primeiro-acesso`.
4. **Senhas:** em Authentication → Attack Protection (ou Passwords), exija no mínimo 15 caracteres, a mesma regra da tela, e ligue a proteção contra senha vazada se o plano permitir.
5. **E-mail:** o SMTP padrão do Supabase só entrega para os membros do time do projeto. Antes de convidar os coordenadores, configure um SMTP próprio em Authentication → Emails → SMTP Settings.
6. **Segredos das Edge Functions:** renomeie `SUBAPASE-OPENAI_API` para `OPENAI_API_KEY` e apague `SUPABASE-ULR` e `SUPABASE-ANON-PUBLIC`. O Supabase já injeta `SUPABASE_URL` e `SUPABASE_ANON_KEY` em toda função.

## Contas de acesso

**A primeira coordenação geral** é cadastrada uma vez, pelo SQL Editor (o e-mail vai em minúsculas):

```sql
insert into acesso.usuarios (nome, email, papel)
values ('Nome Sobrenome', lower('email@dominio.com.br'), 'coordenacao_geral');
```

**As demais pessoas** a coordenação geral cadastra pela tela Cadastros → Pessoas. Cada uma aparece como "Sem conta" até entrar a primeira vez.

**A conta de acesso** de qualquer pessoa vem do convite:

1. Em Authentication → Users → Invite user, convide o mesmo e-mail do cadastro. Para e-mails de fora da equipe do Supabase, o convite precisa do SMTP próprio, que ainda não está configurado.
2. A pessoa abre o convite, cai em `/primeiro-acesso` e cria a senha.
3. Quando o e-mail é confirmado, um trigger liga a conta ao cadastro sozinho.

O e-mail se corrige pela tela enquanto a pessoa está "Sem conta"; corrigido, ele liga a conta que já existir com o e-mail novo.

## Estrutura

```
ida-aba/
├── src/
│   ├── app/                     # rotas, layout (menu lateral) e providers
│   ├── features/
│   │   ├── auth/                # login, primeiro acesso, recuperação de senha
│   │   ├── cadastros/           # unidades, planos de saúde, pessoas, carteiras e assistidos (coordenação geral)
│   │   └── evolucoes/           # Evoluções do mês (api, queries, componentes, tela)
│   ├── components/  hooks/  lib/  utils/  config/   # código compartilhado
│   └── testing/                 # MSW, factories fictícias e helpers de teste
├── supabase/
│   ├── migrations/              # schema, RLS, auditoria e RPC
│   ├── tests/                   # testes de RLS em transação que se desfaz
│   └── functions/_shared/dominio/   # domínio puro (mês, período, prazo), do app e das Edge Functions
├── tests/e2e/                   # Playwright com Supabase fictício
├── prototipo/                   # protótipo navegável, referência de telas e regras
├── docs/                        # domínio (regras E01–E28), stack e design system
├── vercel.json                  # build, SPA e cabeçalhos de segurança (CSP, HSTS)
└── .github/workflows/ci.yml     # CI
```

O import segue uma direção só: o código compartilhado não conhece as features, e uma feature não importa outra nem o `app/`. O ESLint barra o que fugir disso.

Os documentos reais do cliente (PDF do Tita, modelo e manual) têm dados de crianças e ficam em `arquivos/`, fora do git. Nenhum dado real entra em código, teste, log ou commit, e nenhum texto de assistido vai para a IA sem a pseudonimização (E05).

## Protótipo

O protótipo é descartável: serve de referência de telas e regras, e o código dele não é reaproveitado no sistema.

### Abrir

O protótipo é um único arquivo HTML, sem build e sem dependências. Duas formas:

- Abrir `prototipo/evolucao-aba.html` direto no navegador; ou
- Servir a pasta e abrir <http://localhost:4174/evolucao-aba.html>:

```bash
python -m http.server 4174 --bind 127.0.0.1 --directory prototipo
```

No Claude Code, a configuração `prototipo-aba` em `.claude/launch.json` faz o mesmo.

Os dados vivem só na memória da aba. Recarregar a página, ou o botão de reiniciar no rodapé do menu, volta tudo ao estado inicial. A IA é simulada e nenhum arquivo escolhido é lido: o PDF do Tita e os outros documentos usam exemplos fictícios.

### Roteiro de demonstração (18 minutos)

Hoje na simulação é 04/11/2026: está aberta a evolução de novembro, que analisa as sessões de 01/10 a 31/10 (E18), e o arquivo do mês vai a contas médicas até 10/11.

1. **Evoluções do mês (coordenadora Lívia Cordeiro).** A tabela mostra os 18 assistidos da carteira. Os cards filtram a tabela; tocar de novo desfaz o filtro. O mês anterior está fechado e abre o arquivo enviado.
2. **Nova evolução mensal → Theo Barros Cavalcanti, com o PDF do Tita.** Os exemplos "De outro assistido", "De setembro" e "Só de uma profissional" são recusados e dizem o porquê; "Com datas fora do período" mostra os dias que ficam de fora da análise (E19). "Arquivo certo" mostra os Dados do Favorecido e a leitura conferida: 15 de 15 análises, 1 falta, nome trocado por "o assistido" antes da IA e 1 quebra de página removida.
3. **Outros documentos.** No mesmo passo, junte os exemplos: o relatório da escola entra com alerta (data fora do período), o da fonoaudiologia e a foto do registro da família entram; "De outro assistido" bloqueia a geração até sair da lista. "Tirar foto" abre a câmera.
4. **Gerar rascunho com a IA.** O rascunho vem em 4 partes e lê o Tita e os documentos. Toque numa frase: a aba Fontes destaca as evoluções diárias ou o documento de onde ela saiu. As conferências mostram uma lacuna (tato de objetos não aparece em outubro), 3 metas alcançadas e uma meta sem programa citado. A lacuna se resolve como "não trabalhado" (a frase entra no texto e o alerta da meta some) ou "Ignorar" (nada entra no texto). O botão "i" sugere uma orientação para a IA, que a coordenação geral aprova. Marque as 4 partes como conferidas, conclua e veja o documento no formato do Word. A evolução concluída não vai sozinha a contas médicas: ela entra no arquivo do mês.
5. **Escrever à mão.** Em Nova evolução, escolha outro assistido e "Escrever à mão": as seções da evolução abrem em branco. "Preencher com um exemplo" escreve um mês em linguagem do dia a dia, e as metas do cadastro entram com um toque. "Aprimorar com a IA" melhora a linguagem sem acrescentar fato, abre lacuna para o programa do cadastro que o texto não cita e guarda as duas versões (Comparar). A aba Fontes mostra o que foi escrito.
6. **Evolução das metas em gráfico.** Na lista de evoluções, o ícone de gráfico ao lado de cada assistido abre a evolução das metas. No Theo: 6 de 9 metas chegaram à independência, acima da mediana da carteira. Os destaques levam à meta mais rápida, à que está no mesmo degrau (imitação motora grossa) e à que não aparece em outubro (tato de objetos, a mesma lacuna do rascunho). Cada meta tem a sua escada, de ajuda física total até independente: toque num ponto para ver a frase da análise de onde a IA leu o nível. Os cards filtram as metas, o mapa mostra as sessões por semana e "Tabela" traz os mesmos números (E27). "Baixar PDF" gera o relatório com tudo isso. O ícone de compartilhar envia o PDF pelo aparelho ou copia o link, avisa que são dados de saúde e mostra o registro de quem baixou e enviou (E28).
7. **Os outros casos da carteira**, em Em conferência:
   - **Helena:** texto com 6 linhas (bloqueia) e "comportamento agressivo" (troca pelo termo técnico em um toque). Edite o texto até 7 linhas.
   - **Isis:** plano em branco (corrija no cadastro), meta em manutenção há 2 meses e a frequência baixa citada na abertura.
   - **Alice:** texto 90% igual ao do mês anterior (Comparar, Gerar de novo) e uma meta já alcançada entre as metas do mês.
   - **Benício:** devolvido pela coordenação geral com o motivo.
8. **Arquivo do mês** (menu). A lista do envio mostra o que falta: assistidos sem evolução, evoluções em conferência e a assinatura. "Enviar o arquivo do mês" bloqueia e leva às pendências; com a carteira toda concluída, envia todas as evoluções de uma vez e o arquivo fica só leitura (E24).
9. **Trocar para Coordenação geral** (botão ao lado do nome, no rodapé do menu). O painel tem 4 cards que filtram a lista, entre eles "Parecidas com a anterior", e cada coordenador mostra se o arquivo do mês já foi enviado (Camila Nunes e Júlia Prado já enviaram). Toque num coordenador para ver as evoluções dele; abra uma concluída e devolva com um motivo (só antes do envio do arquivo). Em Metas dos assistidos fica o cadastro de metas de cada um (E23); em Configurações, as orientações da IA sugeridas pelos coordenadores, para aprovar ou recusar (E21, E22).
10. **Trocar para Contas médicas.** Chegam arquivos, não evoluções soltas: os cards "Arquivos recebidos" (2 de 6) e "Arquivos a chegar" filtram a lista, com filtro por plano e unidade. "Por arquivo" abre o arquivo do mês de Camila Nunes, com os 14 assistidos em ordem alfabética e a assinatura no fim; "Por assistido" leva ao bloco do assistido dentro do arquivo. O documento baixa em Word.
11. **Assinatura e termos.** Sem assinatura cadastrada, o envio do arquivo bloqueia; a assinatura entra por arquivo ou foto pela câmera. A lista de termos inadequados é mantida pela coordenação geral.
