-- Auditoria: cada inserção, alteração e exclusão das tabelas de negócio fica gravada por trigger.
-- Ninguém escreve direto (nem o service role); só a coordenação geral lê.

create table auditoria.eventos (
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),
  schema_nome text not null,
  tabela text not null,
  registro_id text,                 -- chave primária do registro; composta vira "a:b"
  operacao char(1) not null check (operacao in ('I', 'U', 'D')),
  usuario_id bigint,                -- acesso.usuarios.id, sem FK (a auditoria não referencia ninguém)
  dados_antes jsonb,
  dados_depois jsonb,
  campos_alterados text[]
);

create index eventos_tabela_registro_idx on auditoria.eventos (tabela, registro_id);
create index eventos_ocorrido_em_idx on auditoria.eventos (ocorrido_em);

-- Trigger genérico. Argumentos opcionais: colunas da chave primária (padrão: `id`).
create function interno.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes jsonb;
  depois jsonb;
  alterados text[];
  chaves text[] := case when tg_nargs = 0 then array['id'] else tg_argv end;
  registro text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    antes := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    depois := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(d.key order by d.key), '{}')
      into alterados
      from jsonb_each(depois) d
     where d.value is distinct from antes -> d.key
       and d.key not in ('atualizado_em', 'atualizado_por');
    if alterados = '{}' then
      return null; -- nada mudou de fato
    end if;
  end if;

  select string_agg(coalesce(depois, antes) ->> k, ':' order by ord)
    into registro
    from unnest(chaves) with ordinality as c(k, ord);

  insert into auditoria.eventos
    (schema_nome, tabela, registro_id, operacao, usuario_id, dados_antes, dados_depois, campos_alterados)
  values
    (tg_table_schema, tg_table_name, registro, left(tg_op, 1), interno.usuario_atual_id(),
     antes, depois, alterados);

  return null;
end;
$$;

revoke all on function interno.registrar_auditoria() from public, anon, authenticated;

create trigger auditoria
  after insert or update or delete on acesso.usuarios
  for each row execute function interno.registrar_auditoria();

revoke all on all tables in schema auditoria from public, anon, authenticated, service_role;
grant select on auditoria.eventos to authenticated, service_role;

alter table auditoria.eventos enable row level security;
alter table auditoria.eventos force row level security;

create policy coordenacao_geral_le on auditoria.eventos
  for select to authenticated
  using ((select interno.eh_coordenacao_geral()));
