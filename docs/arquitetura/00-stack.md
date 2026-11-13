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
| `tita` | Cada importação: o PDF original (Storage privado), os Dados do Favorecido, o período do PDF e as análises lidas, com data, falta, situação diante do período analisado e datas citadas no texto (E19). Nada se apaga; uma nova importação substitui a anterior sem apagá-la. |
| `evolucao` | Evolução por assistido e mês da evolução, com o período analisado calculado (E18) e a origem (PDF do Tita ou entrada manual, E26); os **outros documentos** da análise (E25); os **dias analisados** (E20); as 4 partes com as versões (IA ou coordenador, com a instrução usada), as datas e os documentos de origem de cada frase e meta, lacunas resolvidas, conferências com ciência, situação e devolução; o **arquivo do mês** de cada carteira, que é o que vai para contas médicas e leva as evoluções (E24); o **nível de apoio** que a IA leu para cada programa em cada evolução diária, base da evolução das metas em gráfico (E27). |
| `config` | Termos inadequados e substitutos (P12), limites (linhas mínimas, semelhança, frequência), a frase padrão das metas, o catálogo de programas, as **dicas para a IA** (`dica_ia`) e as **orientações da IA** aprovadas (`orientacao_ia`) (E21, E22). |
| `acesso` | Usuários e papéis. O RLS limita o coordenador à carteira dele e contas médicas aos arquivos do mês enviados. |
| `auditoria` | Trilha de quem fez o quê e quando (o "Histórico" do protótipo), inclusive cada download, envio e link copiado do relatório de metas (E28). |

**Domínio puro** (`supabase/functions/_shared/dominio/`, TypeScript sem Deno nem Node, testado à parte): leitura do texto do Tita, com os blocos, as faltas e as quebras de página (E02–E04); período analisado a partir do mês da evolução e datas divergentes, inclusive as citadas no texto da análise (E18, E19), sem depender da IA; pseudonimização e volta do nome (E05); conferências das 4 partes (E09–E12); semelhança com o mês anterior (n-gramas); código da evolução (E16) e prazo (E15); o que falta para enviar o arquivo do mês (E24); atualização do cadastro de metas no envio (E23); os indicadores da evolução das metas: primeira sessão independente, mesmo degrau há 3 semanas, meta sem registro no mês e a mediana da carteira (E27). O mesmo código roda no navegador e nas Edge Functions.

**Edge Functions** (proposta):

| Função | O que faz |
|---|---|
| `importar-tita` | Recebe o PDF, extrai o texto no servidor, confere favorecido, período, terapia e filtro (E03), separa as análises fora do período e as que citam outra data (E19) e grava tudo. |
| `importar-documento` | Recebe PDF, Word ou imagem (arquivo ou câmera), extrai o texto no servidor (OCR na imagem), tira o nome (E05), confere de quem é o documento e a data diante do período (E25) e grava. |
| `gerar-rascunho` | Chama a API da OpenAI só pelo servidor (P10), com as orientações da IA ativas no início do prompt (E22), o texto pseudonimizado só das análises do período e dos outros documentos aceitos (E25), a evolução anterior e as metas em desenvolvimento do cadastro (E23). Registra na versão quais orientações estavam ativas. Na mesma transação grava os dias analisados (E20). Pede saída estruturada (JSON validado por zod) com as 4 partes, as datas e os documentos de origem e as lacunas, e o nível de apoio de cada programa em cada evolução diária, com a frase de onde saiu (E27; o de mais apoio quando a frase cita mais de um, nulo quando não diz). Também gera uma parte de novo com instrução. |
| `concluir-evolucao`, `reabrir-evolucao`, `devolver-evolucao` | As transições de E13, validadas no servidor: só conclui sem bloqueio; reabrir e devolver só enquanto o arquivo do mês não foi enviado. |
| `aprimorar-texto` | Entrada manual (E26): recebe as seções escritas pelo coordenador, sem o nome (E05), com as orientações ativas (E22), e pede à IA o texto aprimorado por seção, sem fato novo (o prompt proíbe acrescentar o que não está no texto e a saída é conferida contra ele). Calcula as lacunas pelo cadastro de metas e grava as duas versões de cada parte (E07). Não grava dia analisado. |
| (sem função) envio do arquivo | Feito sem Edge Function: enviar o arquivo do mês (E24) é gravar uma linha em `evolucao.arquivos` com a carteira. Os triggers, na mesma transação, conferem que a carteira toda está concluída e que há assinatura (E14), preenchem o mês aberto e quem assina e marcam as evoluções como enviadas. A atualização do cadastro de metas (E23) entra com o cadastro de metas. Não existe envio de uma evolução sozinha. |
| `emitir-docx` | Gera o Word do modelo (Cambria 12, espaçamento 1,5), com o nome de volta e a assinatura: o arquivo do mês, que vai para contas médicas, e a evolução de um assistido, só para conferência. |
| `emitir-relatorio-metas` | Gera o PDF da evolução das metas (E28) com os números do domínio puro, os mesmos da tela, e uma biblioteca de PDF que roda no Deno (pdf-lib, por exemplo), sem navegador. O texto é selecionável, o nome volta só no PDF e o arquivo leva o código do assistido. Confere o acesso (coordenador da carteira ou coordenação geral) e grava o registro em `auditoria.relatorio_metas`. O envio pelo aparelho usa a Web Share API no navegador, com o arquivo, e cai no download onde ela não envia arquivo; o registro do envio chega por uma chamada à mesma função. |

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

-- E25: outros documentos que entram na análise, além do PDF do Tita
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

-- E27: o nível de apoio que a IA leu para cada programa em cada evolução diária
create table evolucao.nivel_apoio (
  evolucao_diaria_id  uuid not null references tita.evolucao_diaria on delete cascade,
  programa            text not null references config.programa,
  nivel               smallint check (nivel between 1 and 5),                 -- 1 ajuda física total ... 5 independente; nulo: sem nível
  trecho              text not null,                                            -- a frase de onde saiu, já sem o nome (E05)
  primary key (evolucao_diaria_id, programa)
);
-- A tela de evolução das metas lê a view evolucao.v_escada_meta (assistido, meta, data, nível, trecho);
-- os indicadores vêm do domínio puro, o mesmo código no navegador e nos testes.

-- E28: quem baixou, enviou ou copiou o link do relatório de metas, e quando
create table auditoria.relatorio_metas (
  id            uuid primary key default gen_random_uuid(),
  assistido_id  uuid not null references cadastro.assistido,
  acao          text not null check (acao in ('baixou', 'enviou', 'baixou_para_enviar', 'copiou_link')),
  feito_por     uuid not null references acesso.usuario,
  feito_em      timestamptz not null default now()
);

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

**RLS dessas tabelas:** o coordenador grava `dica_ia` só para evoluções da carteira dele e não lê as dicas dos outros; a coordenação geral lê e cura todas; `orientacao_ia` é lida pela coordenação geral e pela função `gerar-rascunho` (service role). `cadastro.meta` segue a carteira, como o assistido: o coordenador edita a dele, a coordenação geral lê todas. Contas médicas lê `evolucao.arquivos`, as evoluções com `arquivo_id` preenchido e os assistidos delas, e nada mais; o texto das partes chega com o Word. `nivel_apoio` segue a evolução diária: o coordenador lê o da carteira dele, a coordenação geral lê tudo e contas médicas não lê (E27). `auditoria.relatorio_metas` só recebe linha pela função `emitir-relatorio-metas`; o coordenador lê o registro da carteira dele, a coordenação geral lê tudo e contas médicas não lê (E28).

**Testes de banco (pgTAP):** evolução de novembro calcula 01/10 a 31/10 e a de janeiro calcula o dezembro do ano anterior; `dia_analisado` aceita 01/10 e 31/10 e recusa 30/09 e 01/11 na evolução de novembro; o mesmo dia em duas evoluções falha pela PK; dia de outro assistido falha pela FK composta; `dica_ia` não aceita dica curta nem curadoria sem curador; uma orientação por dica; o coordenador não lê dica de outro coordenador; um programa ativo por vez no cadastro de metas; o envio do arquivo recusa carteira com evolução em conferência ou assistido sem evolução, e um segundo arquivo da mesma carteira e mês; contas médicas não lê evolução fora de arquivo enviado; documento de outro assistido não vai para `gerar-rascunho`; evolução manual não grava dia analisado; `nivel_apoio` recusa nível fora de 1 a 5 e o mesmo programa duas vezes na mesma evolução diária; contas médicas não lê `nivel_apoio`; `relatorio_metas` recusa ação fora da lista, o coordenador não lê o registro de outra carteira e contas médicas não lê o registro.

**Rotas do front** seguem as telas do protótipo, listadas em [`../escopo/01-dominio.md`](../escopo/01-dominio.md#6-telas-do-protótipo).
