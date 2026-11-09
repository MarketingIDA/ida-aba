-- Cadastro: unidades, planos de saúde, carteiras (unidade + turno + coordenador) e assistidos.
-- O coordenador lê só os assistidos das carteiras dele; a coordenação geral lê e mantém tudo.

create type cadastro.turno as enum ('manha', 'tarde', 'integral');
create type cadastro.genero as enum ('feminino', 'masculino'); -- "a assistida" / "o assistido" (E05)

create table cadastro.unidades (
  id bigint generated always as identity primary key,
  sigla text not null unique check (sigla ~ '^[A-Z]{2,5}$'), -- entra no código da evolução (E16)
  nome text not null check (length(btrim(nome)) between 2 and 80),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint
);

create table cadastro.planos (
  id bigint generated always as identity primary key,
  nome text not null unique check (length(btrim(nome)) between 2 and 80),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint
);

-- Carteira: os assistidos de um coordenador numa unidade e num turno (um coordenador ativo por
-- unidade e turno, P8).
create table cadastro.carteiras (
  id bigint generated always as identity primary key,
  unidade_id bigint not null references cadastro.unidades (id),
  turno cadastro.turno not null,
  coordenador_id bigint not null references acesso.usuarios (id),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint,
  unique (id, unidade_id) -- alvo da FK composta de assistidos
);

create unique index carteiras_unidade_turno_ativa on cadastro.carteiras (unidade_id, turno) where ativa;
create index carteiras_coordenador_idx on cadastro.carteiras (coordenador_id);

create table cadastro.assistidos (
  id bigint generated always as identity primary key,
  -- Nome completo, com sobrenome (E09).
  nome text not null check (length(btrim(nome)) between 5 and 120 and btrim(nome) ~ '\S\s+\S'),
  genero cadastro.genero not null,
  data_nascimento date check (data_nascimento >= date '1990-01-01'),
  plano_id bigint references cadastro.planos (id), -- sem plano, a evolução bloqueia (E09)
  unidade_id bigint not null references cadastro.unidades (id),
  carteira_id bigint not null,
  sequencia smallint not null check (sequencia between 1 and 999), -- dada pelo banco (E16)
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint,
  foreign key (carteira_id, unidade_id) references cadastro.carteiras (id, unidade_id),
  unique (unidade_id, sequencia)
);

create index assistidos_carteira_idx on cadastro.assistidos (carteira_id, unidade_id);
create index assistidos_plano_idx on cadastro.assistidos (plano_id);

-- A carteira só aceita usuário com papel de coordenador.
create function interno.conferir_coordenador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from acesso.usuarios u where u.id = new.coordenador_id and u.papel = 'coordenador'
  ) then
    raise exception 'A carteira precisa de um usuário com papel de coordenador.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger conferir_coordenador
  before insert or update of coordenador_id on cadastro.carteiras
  for each row execute function interno.conferir_coordenador();

-- Sequência do assistido na unidade (E16): o banco numera; trocar de unidade gera outra.
create function interno.numerar_assistido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.unidade_id is distinct from old.unidade_id then
    perform pg_advisory_xact_lock(hashtextextended('cadastro.assistidos.sequencia', new.unidade_id));
    select coalesce(max(a.sequencia), 0) + 1
      into new.sequencia
      from cadastro.assistidos a
     where a.unidade_id = new.unidade_id;
  else
    new.sequencia := old.sequencia;
  end if;
  return new;
end;
$$;

create trigger numerar_assistido
  before insert or update on cadastro.assistidos
  for each row execute function interno.numerar_assistido();

-- Carteiras do usuário atual (para as policies). Avaliada uma vez por consulta.
create function interno.carteiras_do_usuario()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from cadastro.carteiras c
   where c.coordenador_id = interno.usuario_atual_id();
$$;

create function interno.assistidos_do_usuario()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from cadastro.assistidos a
    join cadastro.carteiras c on c.id = a.carteira_id
   where c.coordenador_id = interno.usuario_atual_id();
$$;

revoke all on function
  interno.conferir_coordenador(), interno.numerar_assistido(),
  interno.carteiras_do_usuario(), interno.assistidos_do_usuario()
  from public, anon, authenticated;
grant execute on function interno.carteiras_do_usuario(), interno.assistidos_do_usuario()
  to authenticated, service_role;

-- Colunas padrão e auditoria em todas as tabelas do cadastro.
do $$
declare
  t text;
begin
  foreach t in array array['unidades', 'planos', 'carteiras', 'assistidos'] loop
    execute format(
      'create trigger colunas_padrao before insert or update on cadastro.%I
         for each row execute function interno.preencher_colunas_padrao()', t);
    execute format(
      'create trigger auditoria after insert or update or delete on cadastro.%I
         for each row execute function interno.registrar_auditoria()', t);
  end loop;
end;
$$;

-- Grants: leitura e escrita (sem DELETE) para `authenticated`; quem pode o quê é o RLS.
revoke all on all tables in schema cadastro from public, anon, authenticated;
grant select on all tables in schema cadastro to authenticated;
grant insert (sigla, nome, ativa), update (sigla, nome, ativa) on cadastro.unidades to authenticated;
grant insert (nome, ativo), update (nome, ativo) on cadastro.planos to authenticated;
grant insert (unidade_id, turno, coordenador_id, ativa), update (unidade_id, turno, coordenador_id, ativa)
  on cadastro.carteiras to authenticated;
grant insert (nome, genero, data_nascimento, plano_id, unidade_id, carteira_id, ativo),
      update (nome, genero, data_nascimento, plano_id, unidade_id, carteira_id, ativo)
  on cadastro.assistidos to authenticated;
grant all on all tables in schema cadastro to service_role;

do $$
declare
  t text;
begin
  foreach t in array array['unidades', 'planos', 'carteiras', 'assistidos'] loop
    execute format('alter table cadastro.%I enable row level security', t);
    execute format('alter table cadastro.%I force row level security', t);
    execute format(
      'create policy coordenacao_geral_insere on cadastro.%I for insert to authenticated
         with check ((select interno.eh_coordenacao_geral()))', t);
    execute format(
      'create policy coordenacao_geral_altera on cadastro.%I for update to authenticated
         using ((select interno.eh_coordenacao_geral()))
         with check ((select interno.eh_coordenacao_geral()))', t);
  end loop;
end;
$$;

-- Unidades, planos e carteiras não têm dado de saúde: todo usuário ativo lê.
create policy usuario_ativo_le on cadastro.unidades
  for select to authenticated using ((select interno.usuario_ativo()));
create policy usuario_ativo_le on cadastro.planos
  for select to authenticated using ((select interno.usuario_ativo()));
create policy usuario_ativo_le on cadastro.carteiras
  for select to authenticated using ((select interno.usuario_ativo()));

-- Assistido: o coordenador lê os da carteira dele; a coordenação geral lê todos.
create policy carteira_ou_coordenacao_geral_le on cadastro.assistidos
  for select to authenticated
  using (
    (select interno.eh_coordenacao_geral())
    or carteira_id in (select interno.carteiras_do_usuario())
  );
