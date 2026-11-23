# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo. Todo mês, cada coordenador de unidade faz a evolução de cada assistido da sua carteira e, até o dia 10, envia a contas médicas o **arquivo do mês**, com as evoluções da carteira toda. A evolução nasce das evoluções diárias registradas no Tita: o coordenador importa o PDF do assistido e, se quiser, outros documentos (escola, outras terapias, família); uma IA escreve o rascunho no formato do modelo da clínica e o coordenador confere parte por parte e conclui. Sem o PDF, ele escreve o mês à mão e a IA aprimora o texto. Cada assistido tem ainda a evolução das metas em gráfico, a partir do nível de apoio que a IA lê nas análises.

**Fase atual: metas e revisão (fatia 5).** No ar: o login dos três perfis, os cadastros, a tela Evoluções do mês, a evolução escrita à mão com a conferência das 4 partes (fatia 1), o arquivo do mês, com a assinatura, o envio a contas médicas e o Word (fatia 2), a importação do PDF do Tita (fatia 3) e o rascunho das partes 2 a 4 pela IA (fatia 4). A fatia 5 vem em partes: o cadastro de metas, a devolução pela coordenação geral, os termos inadequados, as dicas para a IA e os outros documentos (PDF, Word e foto) estão feitos; dos gráficos, já estão a leitura do nível de apoio, a tela do assistido, a mediana da carteira, o "Baixar PDF" e o compartilhar. O [protótipo](#protótipo) continua como referência de telas e regras. A evolução de supervisão é outro relatório e fica para uma fase posterior.

## O que já funciona

- **Acesso:** login por e-mail e senha, primeiro acesso (a pessoa cria a senha pelo link do convite) e recuperação de senha. O papel vem do cadastro em `acesso.usuarios`, nunca do token, e conta sem cadastro ativo não entra.
- **Coordenação de unidade e coordenação geral:** Evoluções do mês, com cards por situação que filtram a lista, busca por nome ou código, escolha do mês (o aberto e os 5 anteriores), período analisado e prazo do arquivo do mês. A coordenação geral vê todas as unidades e recorta por unidade e coordenador.
- **Evolução escrita à mão (coordenador):** "Nova evolução mensal" cria a evolução de um assistido da carteira no mês aberto. O coordenador escreve o texto e as metas, confere as 4 partes e conclui ou reabre. Cada gravação de uma parte vira uma versão nova. A coordenação geral lê a evolução.
- **PDF do Tita (coordenador):** na evolução em conferência, o coordenador importa o Relatório de Evoluções Diárias do assistido. O PDF é lido no navegador, com a biblioteca `pdfjs-dist`, e não é guardado: vão ao banco só os Dados do Favorecido e, de cada evolução diária, a data, a análise do atendimento e se foi falta. A tela mostra o que foi lido, bloqueia o PDF de outro assistido, de outro período, de outra terapia ou com filtro de profissional, e alerta as datas fora do período. Depois de importar, as análises ficam na evolução para consulta enquanto o coordenador escreve. O "Calendário dos dias analisados" mostra no mês do período as sessões e as faltas, e lista as datas de fora do período com o motivo: depois do período fica para a evolução seguinte, e antes diz em que evolução o dia já entrou (E19, E20).
- **Rascunho pela IA (coordenador):** com o PDF do Tita importado, "Gerar rascunho com a IA" escreve as partes 2 a 4 (o texto em 5 trechos, as metas alcançadas e as metas para o mês atual), e o coordenador confere cada parte. A Edge Function `gerar-rascunho` tira o nome do assistido das análises antes de mandar para a IA (E05), e a chave da IA fica só no servidor. Cada rascunho é uma versão nova da parte; o texto anterior fica guardado.
- **Nível de apoio (coordenador):** logo depois de "Usar esta leitura" do PDF do Tita, em segundo plano, a Edge Function `ler-niveis` pede à IA o nível de apoio de cada meta do cadastro que tem programa (menos as suspensas), em cada sessão do período, em 5 degraus (ajuda física total, ajuda física parcial, dica gestual ou modelo, dica verbal, independente). O nome do assistido sai antes (E05). O sistema, não a IA, aplica as regras: o trecho tem de estar na análise, vale o nível de mais apoio citado e o mesmo dia vira um ponto só; sessão sem nível conta como trabalhada, sem nível. Os pontos ficam em `evolucao.niveis_de_apoio`, com o trecho, e a situação da leitura em `evolucao.leituras_de_nivel`; importar de novo apaga os níveis do PDF anterior. A tela do PDF mostra a situação e "Ler de novo". Contas médicas não lê.
- **Evolução das metas em gráfico (coordenador e coordenação geral):** o ícone de gráfico em cada linha da lista de evoluções e o botão "Evolução em gráfico" no cadastro de metas abrem `/progresso/<assistido>`. A tela usa as 3 últimas evoluções do assistido: o painel com quantas metas chegaram à independência semana a semana e os destaques (a mais rápida, a parada no mesmo degrau, a que sumiu no último mês), os cards que filtram as metas, a escada de cada meta (passe o mouse num ponto para ver a frase da análise) e o mapa de sessões por semana. "Tabela" traz os mesmos números e cada sessão com a frase. Um mês sem os níveis lidos não conta como mês sem trabalho: "sem registro" e "mesmo degrau" só valem quando o último mês foi lido. A linha do assistido vem diante da mediana da carteira, em cinza, com "Acima da", "Abaixo da" ou "Na mediana": entram só os assistidos da carteira com algum mês lido na janela, e com menos de dois não há comparação. A função `evolucao.independencia_da_carteira` entrega só um número de ordem por assistido e as datas de independência, sem nome, meta nem trecho, e roda com o login de quem pede. "Baixar PDF" gera o relatório no navegador, com a biblioteca `pdf-lib`, que só carrega nessa hora: o painel, a escada de cada meta e as tabelas, sempre sem o filtro da tela, com texto selecionável. O arquivo leva o código da evolução mais recente (`UNI-AAMM-NNN-METAS.pdf`), não o nome; cada página diz quem emitiu, quando, e que são dados de saúde de uma criança. Antes de o arquivo sair, o download fica registrado em `evolucao.relatorios_de_metas` (quem e quando, preenchidos pelo banco); se o registro falhar, o PDF não sai. O coordenador lê o registro da carteira dele, a coordenação geral lê tudo e contas médicas não lê. Ao lado, o ícone de compartilhar abre a janela com o aviso de dados de saúde, "Enviar o PDF" (WhatsApp, e-mail ou outro aplicativo do aparelho, pela Web Share API), "Copiar o link" (abre só para quem já tem acesso) e o registro de quem baixou, enviou ou copiou. O PDF é montado quando a janela abre, porque o navegador só envia no mesmo toque; por isso o envio e o link são registrados logo depois de sair (um envio cancelado não conta), e o aviso diz se o registro falhar. Onde o navegador não envia arquivo, o PDF é baixado para anexar, registrado antes como "baixou para enviar". O compartilhar não leva o nome: o texto e o arquivo levam o código (E28).
- **Outros documentos (coordenador):** na evolução em conferência, "Juntar documentos" lê PDF, Word (.docx) e foto (JPG, PNG ou WebP) no navegador, vários de uma vez, e "Tirar foto" abre a câmera do celular. O arquivo não é guardado: grava só o texto, já sem o nome do assistido, em `evolucao.documentos`. Se o nome não aparece no texto, o documento fica esperando "É de <nome>" ou "Tirar da lista", e o rascunho não é gerado enquanto isso. A data é sugerida pela mais recente do texto e pode ser corrigida, assim como o tipo; documento sem data ou de fora do período analisado entra com alerta, e a IA o usa como contexto. A IA lê os documentos ativos junto com as análises do Tita. A foto é lida por OCR (`tesseract.js`), também no navegador, com o modelo do português servido pelo próprio site em `/ocr`; o texto lido de foto sempre espera "Conferi: é de <nome>", porque a leitura pode errar o nome. Letra de mão é mal lida.
- **Metas (coordenador e coordenação geral):** o plano terapêutico de cada assistido. Cada meta tem o programa, o texto, o critério de alcance e a situação (em desenvolvimento, alcançada, em manutenção ou suspensa), com cards que filtram a lista. O coordenador cadastra e altera as metas da carteira dele; a coordenação geral lê todas. Na parte 4 da evolução, "Trazer do cadastro de metas" acrescenta as metas em desenvolvimento, e a IA recebe o plano para escrever as partes 3 e 4. Uma meta já alcançada (no cadastro ou na parte 3) não pode voltar às metas para o mês atual (E12), e a parte 3 com menos de 4 metas mostra um aviso (E11). Na evolução mensal, o programa do plano que não aparece nas análises vira **lacuna** (E10) e bloqueia a conclusão até ser resolvido: "Não foi trabalhado" põe no texto a frase de que o programa não foi aplicado, "Foi trabalhado" abre o texto para escrever sobre ele, e "Ignorar" registra quem ignorou; a meta desse programa que continuar nas metas para o mês atual leva um alerta. Também leva um alerta a meta para o mês atual cujo programa, no cadastro, o texto da evolução mensal não cita (E12); não impede a conclusão. Cada frase e cada meta do rascunho da IA guardam as sessões e os documentos de onde saíram, em "Fontes do rascunho da IA" de cada parte (E06, E25); a frase sem fonte aparece marcada. Com o PDF do Tita, a frequência do período abaixo de 75% que a abertura não cita leva um alerta na evolução mensal (E04); não impede a conclusão. Texto 60% ou mais parecido com o da evolução do mês anterior do mesmo assistido leva um alerta na evolução mensal, com a porcentagem (P7); não impede a conclusão. Numa parte escrita pela IA, "Gerar esta parte de novo com a IA" pede só aquela parte de novo, com uma instrução do coordenador, sem o nome do assistido (E05, E08); a versão nova guarda a instrução, a anterior fica guardada (E07), e a parte volta para a conferir. Em "Versões desta parte", cada parte mostra todas as versões, com quem fez, quando e a instrução, e "Comparar com o texto da IA" põe lado a lado o texto da IA e o atual (E07); contas médicas não vê as versões. Na evolução escrita à mão (sem o PDF do Tita), um alerta diz isso, e "Aprimorar com a IA" melhora a linguagem da evolução mensal sem fato novo (E26): o nome sai antes, os termos da lista e as orientações entram, e cada trecho é conferido contra o original (trecho vazio fica vazio, número novo faz o trecho voltar ao original). As metas não vão para a IA, porque o texto delas é o do cadastro. Em cada parte da evolução escrita à mão, "Fontes: escrito à mão" mostra o texto que o coordenador escreveu, quem e quando, e se a IA o aprimorou depois. Na evolução, "Baixar para conferência (Word)" baixa só aquela evolução, no formato do arquivo do mês, com o aviso de que é só para conferência e sem a assinatura (E14): o que vai a contas médicas continua sendo o arquivo do mês. No envio do arquivo do mês, o cadastro acompanha (E23): a meta da parte 3 em desenvolvimento fica alcançada, a que já estava alcançada ou vem marcada "(manutenção)" fica em manutenção, e a meta nova da parte 4 entra sem programa e com o critério "Critério a definir no cadastro". A tela mostra essas mudanças antes da confirmação.
- **Devolução (coordenação geral e coordenador):** na evolução concluída, antes do envio do arquivo do mês, a coordenação geral usa "Devolver com motivo". A evolução volta para conferência, aparece como "Devolvida" na lista e mostra o motivo como bloqueio. Ela só conclui de novo depois de o coordenador da carteira marcar a devolução como resolvida. As devoluções resolvidas ficam na evolução, como registro. Contas médicas não lê as devoluções.
- **Sincronização com a Tita (coordenação geral):** na tela de Assistidos, "Sincronizar com a Tita" busca a lista de favorecidos na API da Tita pela Edge Function `sincronizar-tita` (o token fica só no servidor). Primeiro vêm os números, sem gravar nada; depois de confirmar, quem falta entra como **rascunho**, sem carteira, porque a Tita não diz o turno. A coordenação geral escolhe a carteira (e o gênero, quando a Tita diz "Outros") para o rascunho sair do rascunho; até lá, ele não aparece para coordenador nenhum. O id da Tita é a chave; sem ele, o cadastro feito à mão se liga pelo nome completo e pelo nascimento. A sincronização atualiza nome, gênero e nascimento e nunca mexe em carteira, plano ou ativo. A Imbiribeira fica de fora. O que não entra vira pendência na mesma tela: unidade da Tita que ainda não está ligada (liga-se ali mesmo), nome sem sobrenome, possível duplicado, quem sumiu da Tita e outros. Da Tita entram só id, nome, sexo, nascimento, ativo e unidades: CPF e responsáveis não vêm.
- **Termos inadequados (coordenação geral e coordenador):** em Cadastros, a aba "Termos" guarda as palavras que expõem o assistido, cada uma com o termo técnico que a substitui; só a coordenação geral inclui, altera e desativa. Na evolução, o termo da lista que aparece no texto fica marcado e vira um alerta, que não bloqueia a conclusão. O coordenador troca pelo substituto com um toque, e a troca vira uma versão nova do texto. O termo vale como palavra inteira, sem ligar para maiúscula nem acento. A lista começa vazia.
- **Dicas para a IA e orientações (coordenador e coordenação geral):** nos blocos que a IA escreveu (os 5 trechos do texto e as duas listas de metas), o coordenador usa "Dica para a IA" para dizer o que ela deve fazer diferente. A dica não muda o texto da evolução; o nome do assistido sai dela antes de gravar. No menu "Orientações da IA", a coordenação geral vê as dicas, com cards por situação, e aprova, ajustando a redação, ou descarta, com motivo opcional. A dica aprovada vira uma orientação, que a IA lê antes de gerar cada rascunho, em todas as unidades. A orientação pode ser retirada e voltar a ser usada.
- **Assinatura (coordenador):** a imagem da assinatura ou do carimbo, por arquivo ou foto, que vai no fim do arquivo do mês, acima do nome e do CRP. A imagem fica no bucket privado `assinaturas` do Storage. Trocar não apaga a anterior: o arquivo já enviado fica com a assinatura da época.
- **Cadastros (coordenação geral):** unidades, planos de saúde, pessoas, carteiras e assistidos, com o cadastro e a alteração numa gaveta lateral. Nada se apaga: o que não vale mais fica desativado. A unidade tem CNPJ, obrigatório (numérico ou alfanumérico, com os dígitos conferidos), e endereço, opcional. A carteira junta uma unidade, um turno e quem coordena; só pode haver uma carteira ativa por unidade e turno, e passar a carteira para outra pessoa muda quem vê os assistidos e as evoluções dela. O assistido fica numa carteira ativa e leva a unidade dela; o número dele na unidade, que entra no código da evolução, o banco dá sozinho. A lista de assistidos tem busca pelo nome (sem ligar para acento) e filtro por carteira, e avisa quem está sem plano.
  - Cada pessoa tem um papel (coordenação de unidade, coordenação geral ou contas médicas) e, se coordena unidade, o CRP. Quem ainda não entrou aparece como "Sem conta".
  - Desativar corta o acesso na hora. O e-mail trava depois que a pessoa tem conta, e ninguém muda o próprio papel nem se desativa.
- **Arquivo do mês (coordenador):** cada carteira (unidade e turno) envia um arquivo por mês a contas médicas. A tela mostra o que falta: evoluções sem concluir e a assinatura. Com a carteira toda concluída, o coordenador confirma e envia. O envio não tem volta: as evoluções ficam enviadas na mesma data e hora, só para leitura, e a carteira não abre outra evolução naquele mês. Só o mês aberto pode ser enviado.
- **Arquivos recebidos (contas médicas) e arquivos enviados (coordenação geral):** as carteiras do mês, com cards que filtram entre as que já enviaram e as que faltam. Cada arquivo recebido tem o botão "Baixar Word" e abre a lista das evoluções, com o nome, o código e o plano. A busca por assistido acha a evolução em qualquer arquivo que chegou no mês, pelo nome (sem acento), pelo código ou pelo plano, e diz de que carteira é (E24).
- **Word do arquivo do mês:** no formato do modelo, em Cambria 12 com espaçamento 1,5: o cabeçalho uma vez, um bloco por assistido em ordem alfabética e a assinatura no fim, com o nome e o CRP. O documento é montado no navegador de quem baixa, com a biblioteca `docx`, que só carrega nessa hora. Antes do envio, o coordenador baixa a prévia, que sai marcada como prévia no topo e no nome do arquivo.
- **Banco:** RLS em todas as tabelas. O coordenador lê só a própria carteira; a coordenação geral lê tudo e é a única que cadastra; contas médicas lê só os arquivos enviados, as evoluções que estão neles, os assistidos delas, a versão final do texto e a assinatura que foi no arquivo, sem os rascunhos. O banco nunca fica sem coordenação geral ativa, não deixa mudar o papel de quem tem carteira ativa nem desativar carteira com assistidos ativos, não põe assistido ativo em carteira desativada e não grava unidade sem CNPJ válido. Toda alteração fica na auditoria.

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

**Teste à mão:** o [roteiro de testes à mão](docs/testes/roteiro-de-testes-a-mao.md) percorre no site, por perfil, tudo o que está no ar, começando pela carteira de teste.

O CI (`.github/workflows/ci.yml`) roda lint, tipos, testes com cobertura, build, E2E, gitleaks, Semgrep e auditoria de dependências em todo PR. O job `Resultado` reúne todos.

## Variáveis de ambiente

| Variável | Onde fica | O que é |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` e Vercel | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` e Vercel | chave publicável (`sb_publishable_…`). É pública por desenho: quem protege os dados é o RLS |
| `OPENAI_API_KEY` | segredos das Edge Functions do Supabase | chave da IA; nunca vai para o navegador nem para a Vercel |
| `OPENAI_MODEL` | segredos das Edge Functions do Supabase | o modelo da OpenAI que escreve o rascunho; sem ele a função recusa o pedido |
| `TITA_TOKEN` | segredos das Edge Functions do Supabase | o token da API da Tita (`X-API-TOKEN`) |
| `TITA_ENDPOINT` | segredos das Edge Functions do Supabase | opcional: o endereço da consulta de favorecidos. Se não for um `https://` válido, a função usa o documentado (`https://apiv2.apptita.com.br/api/cadastro/favorecido/consulta/empresa`); só o domínio ganha o caminho da consulta |

A service role e a senha do banco não entram no repositório, no `.env.local` nem na Vercel.

## Banco (Supabase)

- **Schemas:** `acesso` (usuários, papéis e assinaturas), `cadastro` (unidades, planos, carteiras, assistidos, metas e a sincronização com a Tita), `evolucao` (evoluções, as 4 partes, as importações do Tita, os dias analisados e os arquivos do mês), `auditoria` (histórico de alterações) e `interno` (funções auxiliares, fora da API).
- **Migrações** em `supabase/migrations/`, aplicadas em ordem. Elas só acrescentam: nenhuma apaga coluna ou tabela com dado.
- **Testes do RLS:** `supabase/tests/rls_evolucoes.sql` faz 133 verificações de acesso e de regra, inclusive as do Storage da assinatura, as do envio do arquivo do mês, as do conteúdo do Word, as da devolução, as dos termos inadequados, as das dicas para a IA, as dos outros documentos, as do nível de apoio, as da mediana da carteira e as do registro do relatório de metas, as das metas no envio , as das lacunas e as das fontes por frase. Ele roda numa transação que sempre se desfaz, então pode rodar no SQL Editor de produção sem gravar nada. A saída esperada é `RESULTADO: 0 falhas de 133`.

## Configuração do Supabase (uma vez, no painel)

Estes passos ficam com o dono do projeto e não estão no código:

1. **Data API:** em Project Settings → Data API → Exposed schemas, acrescente `acesso`, `cadastro` e `evolucao`. Sem isso, o app recebe "Invalid schema" e ninguém entra.
2. **Cadastro aberto desligado:** em Authentication → Sign In / Providers, desligue "Allow new users to sign up". Só entra quem for convidado.
3. **URLs:** em Authentication → URL Configuration, use `https://ida-aba.vercel.app/primeiro-acesso` como Site URL, para que o convite caia direto na criação da senha. Em Redirect URLs, ponha `https://ida-aba.vercel.app/primeiro-acesso` e `http://localhost:5173/primeiro-acesso`.
4. **Senhas:** em Authentication → Attack Protection (ou Passwords), exija no mínimo 15 caracteres, a mesma regra da tela, e ligue a proteção contra senha vazada se o plano permitir.
5. **E-mail:** o SMTP padrão do Supabase só entrega para os membros do time do projeto. Antes de convidar os coordenadores, configure um SMTP próprio em Authentication → Emails → SMTP Settings.
6. **Segredos das Edge Functions:** renomeie `SUBAPASE-OPENAI_API` para `OPENAI_API_KEY` e apague `SUPABASE-ULR` e `SUPABASE-ANON-PUBLIC`. O Supabase já injeta `SUPABASE_URL` e `SUPABASE_ANON_KEY` em toda função. Crie também `OPENAI_MODEL`, com o nome do modelo da OpenAI que escreve o rascunho, e `TITA_TOKEN` (e, se quiser, `TITA_ENDPOINT`) para a sincronização com a Tita.
7. **Sincronização automática com a Tita:** depois da primeira sincronização pela tela dar certo, rode uma vez no SQL Editor de produção (o token do agendamento é gerado no próprio banco e fica no Vault; ninguém precisa vê-lo):

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'tita_agendamento');
   -- Todo dia às 6h de Recife (9h UTC).
   select cron.schedule('sincronizar-tita', '0 9 * * *', $$
     select net.http_post(
       url := 'https://<ref-do-projeto>.supabase.co/functions/v1/sincronizar-tita',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-agendamento',
         (select decrypted_secret from vault.decrypted_secrets where name = 'tita_agendamento')),
       body := '{}'::jsonb,
       timeout_milliseconds := 60000)
   $$);
   ```

   Para parar: `select cron.unschedule('sincronizar-tita');`. Cada rodada aparece na tela de Assistidos como "(automática)".

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
│   ├── functions/_shared/dominio/   # domínio puro (mês, período, prazo, troca do nome, pedido à IA)
│   ├── functions/gerar-rascunho/    # Edge Function que pede o rascunho à IA
│   └── functions/ler-niveis/        # Edge Function que pede o nível de apoio à IA
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
