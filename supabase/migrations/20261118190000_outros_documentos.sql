-- Outros documentos da evolução (E25), primeira parte: PDF e Word. Além do PDF do Tita, o
-- coordenador junta relatórios da escola, de outra terapia, da família, avaliações e o PEI. O
-- arquivo é lido no navegador e não é guardado, como o PDF do Tita: chega ao banco só o texto, já
-- sem o nome do assistido (E05), com o tipo, a data e quantas vezes o nome foi trocado.
--
-- Quando o nome do assistido não aparece no texto, o documento só entra se o coordenador confirmar
-- que é do assistido (`confirmado`). Documento de outro assistido não chega ao banco: a tela o
-- segura e ele bloqueia o rascunho até sair da lista.
--
-- A data é sugerida pela tela e o coordenador corrige. Documento sem data ou de fora do período
-- analisado entra como contexto, com alerta; o banco não guarda essa situação, porque ela sai da
-- data e do período. Documento não conta como dia analisado (E20).
--
-- Tirar um documento da lista é desmarcar `ativo`: nada se apaga. A IA lê só os ativos.
-- Recusas novas (errcode 23514): `documentos_demais`, `documento_data_futura`.

-- ---------------------------------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------------------------------
create type evolucao.tipo_de_documento as enum (
  'escola', 'terapia', 'familia', 'avaliacao', 'pei', 'outro'
);

create table evolucao.documentos (
  id bigint generated always as identity primary key,
  evolucao_id uuid not null references evolucao.evolucoes (id),
  arquivo_nome text not null check (length(btrim(arquivo_nome)) between 1 and 200),
  tipo evolucao.tipo_de_documento not null default 'outro',
  data_documento date check (data_documento >= date '2000-01-01'),
  paginas smallint check (paginas between 1 and 500), -- o Word não diz
  texto text not null check (length(btrim(texto)) between 1 and 20000), -- já sem o nome (E05)
  trocas smallint not null check (trocas >= 0), -- vezes que o nome foi trocado no texto
  confirmado boolean not null default false, -- o coordenador confirmou que é do assistido
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por bigint references acesso.usuarios (id),
  atualizado_em timestamptz,
  atualizado_por bigint references acesso.usuarios (id),
  check (trocas > 0 or confirmado)
);

create index documentos_evolucao_idx on evolucao.documentos (evolucao_id, id);
create index documentos_criado_por_idx on evolucao.documentos (criado_por);
create index documentos_atualizado_por_idx on evolucao.documentos (atualizado_por);

comment on table evolucao.documentos is
  'Outros documentos da evolução (E25): o texto lido, sem o nome do assistido; o arquivo não é guardado.';

-- ---------------------------------------------------------------------------------------------
-- 2. Trigger
-- ---------------------------------------------------------------------------------------------
-- A evolução em conferência, no máximo 8 documentos ativos (todos vão no mesmo pedido à IA) e a
-- data que não está no futuro.
create function interno.gravar_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.exigir_em_conferencia(new.evolucao_id);
  if new.data_documento > (now() at time zone 'America/Recife')::date then
    raise exception 'A data do documento está no futuro.'
      using errcode = '23514', hint = 'documento_data_futura';
  end if;
  if new.ativo and (tg_op = 'INSERT' or not old.ativo) and (
    select count(*) from evolucao.documentos d
     where d.evolucao_id = new.evolucao_id and d.ativo and d.id is distinct from new.id
  ) >= 8 then
    raise exception 'A evolução já tem 8 documentos.'
      using errcode = '23514', hint = 'documentos_demais';
  end if;
  if tg_op = 'INSERT' then
    new.arquivo_nome := btrim(new.arquivo_nome);
    new.texto := btrim(new.texto);
  end if;
  return new;
end;
$$;

-- O nome vem antes de `gravar_documento` em ordem alfabética: as colunas padrão já estão prontas.
create trigger colunas_padrao
  before insert or update on evolucao.documentos
  for each row execute function interno.preencher_colunas_padrao();
create trigger gravar_documento
  before insert or update on evolucao.documentos
  for each row execute function interno.gravar_documento();

revoke all on function interno.gravar_documento() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Grants e RLS
-- ---------------------------------------------------------------------------------------------
-- O cliente manda o que leu; depois muda só o tipo, a data e se o documento segue na lista.
revoke all on evolucao.documentos from public, anon, authenticated;
grant select,
      insert (evolucao_id, arquivo_nome, tipo, data_documento, paginas, texto, trocas, confirmado),
      update (tipo, data_documento, ativo)
  on evolucao.documentos to authenticated;
grant all on evolucao.documentos to service_role;

alter table evolucao.documentos enable row level security;
alter table evolucao.documentos force row level security;

-- Segue a evolução (o RLS de `evolucoes` vale na subconsulta), menos para contas médicas.
create policy segue_a_evolucao on evolucao.documentos
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
create policy coordenador_junta on evolucao.documentos
  for insert to authenticated
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));
create policy coordenador_altera on evolucao.documentos
  for update to authenticated
  using (evolucao_id in (select interno.evolucoes_do_usuario()))
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));
