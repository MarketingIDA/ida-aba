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
| `cadastro` | Unidades, planos de saúde, assistidos, coordenadores (CRP e assinatura), carteiras por unidade e turno e o **cadastro de metas** de cada assistido, com o histórico de cada meta (E23). A decidir se é compartilhado com o sistema de contas médicas (P11). |
| (sem schema `tita`) | Feito dentro de `evolucao`: `importacoes` guarda cada leitura do PDF do Tita (os Dados do Favorecido e, de cada evolução diária, a data, a análise e se foi falta) e `dias_analisados` guarda os dias do período (E20). O PDF original não é guardado. Nada se apaga; uma nova importação é uma linha nova, e a atual é a última. |
| `evolucao` | Evolução por assistido e mês da evolução, com o período analisado calculado (E18) e a origem (PDF do Tita ou entrada manual, E26); os **outros documentos** da análise (E25); os **dias analisados** (E20); as 4 partes com as versões (IA ou coordenador, com a instrução usada), as datas e os documentos de origem de cada frase e meta, lacunas resolvidas, conferências com ciência, situação e devolução; o **arquivo do mês** de cada carteira, que é o que vai para contas médicas e leva as evoluções (E24); o **nível de apoio** que a IA leu para cada programa em cada evolução diária, base da evolução das metas em gráfico (E27). |
| `config` | (Os termos inadequados e os substitutos, P12, ficaram em `cadastro.termos_inadequados`: o schema `cadastro` já está exposto na Data API, e a lista é mantida pela coordenação geral como os outros cadastros.) Limites (linhas mínimas, semelhança, frequência), a frase padrão das metas, o catálogo de programas, as **dicas para a IA** e as **orientações da IA** aprovadas (E21, E22), que ficaram em `evolucao.dicas_ia` e `evolucao.orientacoes_ia`, pelo mesmo motivo dos termos. |
| `acesso` | Usuários e papéis. O RLS limita o coordenador à carteira dele e contas médicas aos arquivos do mês enviados. |
| `auditoria` | Trilha de quem fez o quê e quando (o "Histórico" do protótipo), inclusive cada download, envio e link copiado do relatório de metas (E28). |

**Domínio puro** (`supabase/functions/_shared/dominio/`, TypeScript sem Deno nem Node, testado à parte): leitura do texto do Tita, com os blocos, as faltas e as quebras de página (E02–E04); período analisado a partir do mês da evolução e datas divergentes, inclusive as citadas no texto da análise (E18, E19), sem depender da IA; pseudonimização e volta do nome (E05); conferências das 4 partes (E09–E12); semelhança com o mês anterior (n-gramas); código da evolução (E16) e prazo (E15); o que falta para enviar o arquivo do mês (E24); atualização do cadastro de metas no envio (E23); os indicadores da evolução das metas: primeira sessão independente, mesmo degrau há 3 semanas, meta sem registro no mês e a mediana da carteira (E27). O mesmo código roda no navegador e nas Edge Functions.

**Edge Functions** (proposta):

| Função | O que faz |
|---|---|
| (sem função) importação do Tita | Feito sem Edge Function: o PDF é lido no navegador com `pdfjs-dist`, carregada só nessa hora, e a leitura é gravada numa linha de `evolucao.importacoes`. A tela confere favorecido, período, terapia e filtro (E03) e separa as análises fora do período e as que citam outra data (E19). Os triggers repetem as recusas da E03 e gravam os dias analisados (E20). |
| `importar-documento` | Não existe. Na fatia 5 (e1), PDF e Word são lidos no navegador, como o PDF do Tita, e não são guardados: o domínio puro (`documentos.ts`) tira o nome (E05), sugere a data e o tipo, e o texto vai para `evolucao.documentos` com o login do coordenador. Sem o nome no texto, a tela pede a confirmação antes de gravar (E25). Na parte (e2), a foto é lida por OCR no navegador (`tesseract.js`, núcleo em WebAssembly e modelo do português servidos pelo próprio site; a CSP ganhou `'wasm-unsafe-eval'`), e o texto de foto sempre passa pela conferência do coordenador. |
| `gerar-rascunho` | Feita na fatia 4. Chama a API da OpenAI só pelo servidor (P10), com o modelo do segredo `OPENAI_MODEL`. Lê, com as permissões de quem chama, a evolução em conferência e a importação do Tita; tira o nome do assistido das análises do período (E05); pede saída estruturada com os 5 trechos e as duas listas de metas; e grava as partes 2 a 4 como versões da IA. As regras ficam no domínio puro (`pseudonimo.ts` e `rascunho.ts`). Lê as orientações ativas (E22), com as permissões de quem chama, e as põe nas instruções, antes das análises. Lê também os outros documentos ativos (E25), troca o nome de novo e os manda depois das análises, com o tipo e a data; o de fora do período ou sem data vai marcado como contexto. Lê o cadastro de metas (E23), sem as suspensas e sem o nome, e manda as metas em desenvolvimento e as já alcançadas, para que a parte 3 copie o texto do plano e a parte 4 não repita meta alcançada. As lacunas (E10) não passam pela IA: o banco calcula, em `evolucao.lacunas`, os programas do plano que não aparecem nas análises (pelo nível de apoio lido, ou pelo texto das análises quando a leitura não existe) e os bloqueia na conclusão até o texto citar o programa ou alguém ignorar a lacuna (`evolucao.lacunas_ignoradas`). Cada análise vai numerada (S1, S2, …) e cada documento também (D1, D2, …); a IA devolve cada frase e cada meta com os números de onde saiu, e a função grava em `evolucao.fontes` as datas e os documentos que existem no pedido, descartando o resto (E06). Ainda não lê a evolução anterior e não gera uma parte só com instrução. |
| `ler-niveis` | Feita na fatia 5 (f1). Chamada pela tela logo depois de importar o PDF do Tita. Lê, com as permissões de quem chama, a importação atual e as metas do assistido com programa (menos as suspensas); tira o nome das análises e das metas (E05); pede à OpenAI, com saída estruturada, os níveis citados e o trecho de cada meta em cada sessão. O domínio puro (`niveis.ts`) confere que o trecho está na análise, fica com o nível de mais apoio e junta o mesmo dia; a função grava pela RPC `evolucao.gravar_niveis`, só com a chave do servidor, que recusa a leitura de um PDF que já não é o atual. Falha grava a situação `falhou`, e a tela oferece "Ler de novo". |
| (sem função) concluir, reabrir e devolver | Feito sem Edge Function: as transições de E13 são validadas por triggers. Concluir e reabrir são a mudança da situação pelo coordenador da carteira, e só conclui sem bloqueio. Devolver é a coordenação geral gravar uma linha em `evolucao.devolucoes` com a evolução e o motivo: o trigger só aceita a evolução concluída (a enviada não volta) e a devolve para "em conferência". A devolução em aberto bloqueia a conclusão até o coordenador marcar `resolvida`. |
| `aprimorar-texto` | Entrada manual (E26): recebe as seções escritas pelo coordenador, sem o nome (E05), com as orientações ativas (E22), e pede à IA o texto aprimorado por seção, sem fato novo (o prompt proíbe acrescentar o que não está no texto e a saída é conferida contra ele). Calcula as lacunas pelo cadastro de metas e grava as duas versões de cada parte (E07). Não grava dia analisado. |
| (sem função) envio do arquivo | Feito sem Edge Function: enviar o arquivo do mês (E24) é gravar uma linha em `evolucao.arquivos` com a carteira. Os triggers, na mesma transação, conferem que a carteira toda está concluída e que há assinatura (E14), preenchem o mês aberto e quem assina e marcam as evoluções como enviadas. Antes de marcar as evoluções, o mesmo trigger aplica `evolucao.plano_das_metas` ao cadastro de metas (E23): parte 3 em desenvolvimento vira alcançada, a já alcançada ou marcada "(manutenção)" vira em manutenção, e a meta nova da parte 4 entra sem programa e com "Critério a definir no cadastro". A meta e a linha se encontram pelo texto normalizado (`interno.normalizar_meta`); a suspensa nunca muda. A tela de confirmação mostra o mesmo plano. Não existe envio de uma evolução sozinha. |
| (sem função) Word do arquivo | Feito sem Edge Function: o Word do modelo (Cambria 12, espaçamento 1,5) é montado no navegador de quem baixa, com a biblioteca `docx`, carregada só nessa hora. A RPC `evolucao.conteudo_do_arquivo` entrega o que o RLS deixa ler: o arquivo enviado, com quem assinou e a assinatura da época, ou a prévia do coordenador antes do envio. A evolução de um assistido sozinha, só para conferência, ainda não tem Word. |
| ~~`emitir-relatorio-metas`~~ | Feito sem Edge Function: o PDF da evolução das metas (E28) é montado no navegador de quem baixa, com `pdf-lib` carregada sob demanda (como o Word com `docx`), a partir dos mesmos números do domínio puro que a tela usa, sempre sem filtro. Texto selecionável, nome só dentro do PDF, arquivo com o código da evolução mais recente (`UNI-AAMM-NNN-METAS.pdf`). O acesso é o do RLS: o registro vai a `evolucao.relatorios_de_metas` antes de o arquivo sair, e sem registro o arquivo não sai. O envio pelo aparelho (Web Share API) e o copiar link gravam no mesmo registro, mas depois de sair: o navegador só envia ou copia no mesmo toque, sem esperar nada antes, e um envio cancelado não conta. Onde a Web Share não envia arquivo, o PDF é baixado para anexar e registrado antes (`baixou_para_enviar`). |

**Tabelas novas do período, das dicas, das metas e do arquivo do mês** (esboço; os nomes "dica-ia" e "orientacao-ia" do pedido viram `dica_ia` e `orientacao_ia`, porque hífen não é nome válido sem aspas no Postgres):

```sql
-- E24: o que vai para contas médicas é o arquivo do mês da carteira, não a evolução sozinha.
-- Feito na migração 20261113120000_arquivo_do_mes.sql; só existe linha do que foi enviado.
create table evolucao.arquivos (
  id                bigint generated always as identity primary key,
  carteira_id       bigint not null references cadastro.carteiras,
  mes_ref           date not null check (extract(day from mes_ref) = 1),
  coordenador_id    bigint not null references acesso.usuarios,              -- quem assina
  coordenador_nome  text not null,                                           -- o nome e o CRP da época
  coordenador_crp   text,
  assinatura_id     bigint not null references acesso.assinaturas,           -- a assinatura da época (E14)
  n_evolucoes       smallint not null check (n_evolucoes > 0),
  enviado_em        timestamptz not null default now(),
  enviado_por       bigint not null references acesso.usuarios,
  unique (carteira_id, mes_ref)                                              -- um arquivo por carteira e mês
);
-- Enviar é gravar a linha com a carteira: o trigger recusa se há assistido ativo da carteira sem
-- evolução ou em conferência, ou se falta a assinatura; depois liga as evoluções (arquivo_id) e as
-- marca enviadas. O Word é gerado na etapa seguinte.

-- E01, E18: uma evolução por assistido e mês; o período analisado sai do mês e não se edita
create table evolucao.evolucao (
  id            uuid primary key default gen_random_uuid(),
  assistido_id  uuid not null references cadastro.assistido,
  mes_ref       date not null check (extract(day from mes_ref) = 1),          -- 2026-11-01 = evolução de novembro
  periodo_ini   date generated always as ((mes_ref - interval '1 month')::date) stored,  -- 2026-10-01
  periodo_fim   date generated always as (mes_ref - 1) stored,                           -- 2026-10-31
  origem        text not null default 'tita' check (origem in ('tita', 'manual')),  -- E26
  -- situação, conclusão, devolução...
  arquivo_id    bigint references evolucao.arquivos,                         -- preenchido no envio do arquivo (E24)
  unique (assistido_id, mes_ref),
  unique (id, assistido_id, mes_ref)                                           -- alvo da FK composta abaixo
);

-- E25: outros documentos que entram na análise, além do PDF do Tita.
-- Feita na fatia 5 (e1) como evolucao.documentos, diferente deste esboço: sem Storage (o arquivo
-- não é guardado), id bigint, data_documento, paginas, trocas, confirmado e ativo no lugar de
-- situacao; documento de outro assistido não chega ao banco. Ver a migração 20261118190000.
create table evolucao.documento (
  id            uuid primary key default gen_random_uuid(),
  evolucao_id   uuid not null references evolucao.evolucao on delete cascade,
  tipo          text not null check (tipo in ('escola', 'terapia', 'familia', 'avaliacao', 'pei', 'outro')),
  nome_arquivo  text not null,
  storage_path  text not null,                                               -- Storage privado
  via           text not null check (via in ('arquivo', 'camera')),
  data_doc      date,
  texto         text not null,                                               -- já sem o nome (E05)
  situacao      text not null check (situacao in ('ok', 'fora_do_periodo', 'outro_assistido')),
  incluido_por  uuid not null references acesso.usuario,
  incluido_em   timestamptz not null default now()
);
-- gerar-rascunho lê só documento com situacao <> 'outro_assistido'; a frase guarda os ids em "fd".

-- E19: cada evolução diária lida, com a situação diante do período
create table tita.evolucao_diaria (
  id             uuid primary key default gen_random_uuid(),
  importacao_id  uuid not null references tita.importacao on delete cascade,
  data           date not null,
  falta          boolean not null,
  analise        text not null,                                              -- já pseudonimizada (E05)
  situacao       text not null check (situacao in ('no_periodo', 'antes', 'depois')),
  datas_citadas  date[] not null default '{}'                                -- datas do texto diferentes de "data"
);

-- E20: um dia de um assistido pertence a uma evolução só, e só a uma cujo período o contenha.
-- Sem trigger: a FK composta traz o mes_ref da evolução e o check confere a data contra ele.
create table evolucao.dia_analisado (
  assistido_id  uuid not null,
  data          date not null,
  evolucao_id   uuid not null,
  mes_ref       date not null,
  n_evolucoes   smallint not null check (n_evolucoes > 0),                   -- evoluções diárias no dia
  falta         boolean not null,                                            -- só falta naquele dia
  primary key (assistido_id, data),
  foreign key (evolucao_id, assistido_id, mes_ref)
    references evolucao.evolucao (id, assistido_id, mes_ref) on delete cascade,
  check (data >= (mes_ref - interval '1 month')::date and data < mes_ref)
);
-- Importar de novo: a RPC evolucao.registrar_dias(evolucao_id, dias jsonb) apaga os dias da
-- mesma evolução e grava os novos na mesma transação; dia de outra evolução vira erro de PK.

-- E27 (feito na fatia 5, parte f1): o nível de apoio de cada meta do cadastro com programa, por dia
create table evolucao.niveis_de_apoio (
  meta_id      bigint not null references cadastro.metas,
  data         date not null,                                   -- um dia é de uma evolução só (E20)
  evolucao_id  uuid not null references evolucao.evolucoes,
  nivel        smallint check (nivel between 1 and 5),          -- 1 ajuda física total ... 5 independente; nulo: sem nível
  trecho       text not null,                                   -- a frase de onde saiu, já sem o nome (E05)
  primary key (meta_id, data)
);
-- evolucao.leituras_de_nivel: a situação da leitura da importação atual (lida, sem_metas, falhou).
-- Só a RPC evolucao.gravar_niveis grava (service_role, pela Edge Function ler-niveis); importar de
-- novo apaga os níveis e a leitura por trigger. A tela de evolução das metas (f2a) lê essas tabelas
-- direto, nas 3 últimas evoluções do assistido, sem view; os indicadores vêm do domínio puro
-- (dominio/progresso.ts), o mesmo código no navegador e nos testes. A mediana da carteira (f2b) sai
-- da RPC evolucao.independencia_da_carteira(assistido, inicio, fim), security invoker: um número de
-- ordem por assistido lido da carteira e o dia em que cada meta ativa chegou à independência, sem
-- nome, meta, nível nem trecho; a mediana é do domínio puro (dominio/mediana.ts).

-- E28: quem baixou, enviou ou copiou o link do relatório de metas, e quando. Fica em `evolucao`, não
-- em `auditoria`, porque a API não expõe `auditoria` e o coordenador precisa ler o registro.
create table evolucao.relatorios_de_metas (
  id              bigint generated always as identity primary key,
  assistido_id    bigint not null references cadastro.assistidos,
  acao            text not null check (acao in ('baixou', 'enviou', 'baixou_para_enviar', 'copiou_link')),
  feito_por       bigint not null references acesso.usuarios,  -- preenchido por trigger
  feito_por_nome  text not null,                                -- preenchido por trigger
  feito_em        timestamptz not null default now()            -- preenchido por trigger
);
-- O cliente só informa assistido_id e acao (grant de coluna); o RLS aceita o assistido que ele vê.

-- E21: a dica que o coordenador deixa no botão "i" de um bloco ("dica-ia")
create table config.dica_ia (
  id              uuid primary key default gen_random_uuid(),
  criada_em       timestamptz not null default now(),                        -- data e hora
  usuario_id      uuid not null references acesso.usuario,
  evolucao_id     uuid not null references evolucao.evolucao,
  campo           text not null check (campo in ('p2:abertura', 'p2:programas', 'p2:comportamentos',
                                                 'p2:recursos', 'p2:fechamento', 'p3', 'p4')),
  texto_original  text not null,                                             -- última versão da IA, sem nome (E05)
  dica            text not null check (char_length(dica) >= 10),             -- sem nome (E05)
  situacao        text not null default 'pendente' check (situacao in ('pendente', 'aprovada', 'descartada')),
  curada_por      uuid references acesso.usuario,
  curada_em       timestamptz,
  motivo          text,
  check ((situacao = 'pendente') = (curada_por is null))
);

-- E22: a orientação aprovada, que a IA lê antes de cada análise ("orientacao-ia")
create table config.orientacao_ia (
  id           bigint generated always as identity primary key,
  campo        text not null,
  texto        text not null,
  dica_id      uuid unique references config.dica_ia,                        -- uma orientação por dica
  aprovada_por uuid not null references acesso.usuario,
  aprovada_em  timestamptz not null default now(),
  ativa        boolean not null default true,
  retirada_por uuid references acesso.usuario,
  retirada_em  timestamptz,
  check (ativa = (retirada_por is null))
);
-- Aprovar é a RPC config.aprovar_dica(dica_id, texto): grava a orientação e marca a dica na mesma transação.

-- E23: cadastro de metas por assistido (o plano terapêutico)
-- Feito na migração 20261116150000_cadastro_de_metas.sql como `cadastro.metas`: o programa é texto
-- livre (ainda não há catálogo) e o histórico de cada mudança fica na auditoria. A atualização
-- no envio do arquivo está em 20261120120000_metas_no_envio.sql. O esboço abaixo é o desenho original.
create table cadastro.meta (
  id            uuid primary key default gen_random_uuid(),
  assistido_id  uuid not null references cadastro.assistido,
  programa      text references config.programa,                             -- pode ficar sem programa
  texto         text not null,
  criterio      text not null,
  situacao      text not null check (situacao in ('desenvolvimento', 'alcancada', 'manutencao', 'suspensa')),
  inicio        date not null,
  alcancada_na  uuid references evolucao.evolucao,                           -- evolução em que foi alcançada
  alcancada_em  date
);
create unique index meta_programa_ativo on cadastro.meta (assistido_id, programa)
  where situacao in ('desenvolvimento', 'suspensa');                         -- um programa ativo por vez
create table cadastro.meta_historico (
  meta_id      uuid not null references cadastro.meta on delete cascade,
  quando       timestamptz not null default now(),
  usuario_id   uuid references acesso.usuario,                               -- nulo quando é o sistema no envio
  evento       text not null,
  evolucao_id  uuid references evolucao.evolucao
);
```

**RLS dessas tabelas:** o coordenador grava `dicas_ia` só para evoluções da carteira dele e não lê as dicas dos outros; a coordenação geral lê e cura todas; `orientacoes_ia` é lida pela coordenação geral e pelos coordenadores, porque a função `gerar-rascunho` lê as orientações com o login de quem pede o rascunho. `cadastro.meta` segue a carteira, como o assistido: o coordenador edita a dele, a coordenação geral lê todas. Contas médicas lê `evolucao.arquivos`, as evoluções com `arquivo_id` preenchido e os assistidos delas, a versão final de cada parte dessas evoluções e a assinatura que foi no arquivo, e nada mais: os rascunhos e as partes ficam fechados. `niveis_de_apoio` e `leituras_de_nivel` seguem a evolução: o coordenador lê o da carteira dele, a coordenação geral lê tudo e contas médicas não lê (E27). `evolucao.relatorios_de_metas` recebe linha só de quem vê o assistido, e quem fez e quando vêm do trigger; o coordenador lê o registro da carteira dele, a coordenação geral lê tudo e contas médicas não lê (E28).

**Testes de banco (pgTAP):** evolução de novembro calcula 01/10 a 31/10 e a de janeiro calcula o dezembro do ano anterior; `dia_analisado` aceita 01/10 e 31/10 e recusa 30/09 e 01/11 na evolução de novembro; o mesmo dia em duas evoluções falha pela PK; dia de outro assistido falha pela FK composta; `dica_ia` não aceita dica curta nem curadoria sem curador; uma orientação por dica; o coordenador não lê dica de outro coordenador; um programa ativo por vez no cadastro de metas; o envio do arquivo recusa carteira com evolução em conferência ou assistido sem evolução, e um segundo arquivo da mesma carteira e mês; contas médicas não lê evolução fora de arquivo enviado; documento de outro assistido não vai para `gerar-rascunho`; evolução manual não grava dia analisado; `gravar_niveis` recusa dia fora do período e a leitura de um PDF que já não vale, importar de novo apaga os níveis, o cliente não grava nível e contas médicas não lê `niveis_de_apoio`; `relatorios_de_metas` recusa ação fora da lista e `feito_por` informado pelo cliente, o coordenador não lê o registro de outra carteira e contas médicas não lê o registro.

**Rotas do front** seguem as telas do protótipo, listadas em [`../escopo/01-dominio.md`](../escopo/01-dominio.md#6-telas-do-protótipo).
