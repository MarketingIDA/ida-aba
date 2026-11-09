-- Fundação: schemas, usuários com papel, colunas padrão e vínculo com o Supabase Auth.
-- Banco de produção com dados de saúde de crianças: RLS enable + force em toda tabela, nenhum
-- privilégio para `anon`, nada de DELETE para `authenticated` (nada se apaga: usa-se `ativo`).

-- Schemas. `interno` guarda funções auxiliares e NÃO é exposto na Data API; `acesso`, `cadastro`
-- e `evolucao` são expostos só para `authenticated`; `auditoria` não é exposto.
create schema if not exists interno;
create schema if not exists acesso;
create schema if not exists cadastro;
create schema if not exists evolucao;
create schema if not exists auditoria;

revoke all on schema interno, acesso, cadastro, evolucao, auditoria from public, anon;
grant usage on schema interno, acesso, cadastro, evolucao, auditoria to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Usuários e papéis
-- ---------------------------------------------------------------------------------------------

create type acesso.papel as enum ('coordenador', 'coordenacao_geral', 'contas_medicas');

create table acesso.usuarios (
  id bigint generated always as identity primary key,
  nome text not null check (length(btrim(nome)) between 2 and 120),
  email text not null unique
    check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  papel acesso.papel not null,
  crp text check (crp is null or length(btrim(crp)) between 4 and 20), -- coordenador assina com o CRP
  ativo boolean not null default true,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint
);

comment on table acesso.usuarios is
  'Quem usa o sistema e com qual papel. O papel vem daqui, nunca do JWT; desativar vale na hora.';

-- Funções das policies: security definer, search_path vazio, schema não exposto. O papel vem do
-- banco, nunca do JWT nem de user_metadata.
create function interno.usuario_atual_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from acesso.usuarios u
   where u.auth_user_id = (select auth.uid()) and u.ativo;
$$;

create function interno.usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from acesso.usuarios u
     where u.auth_user_id = (select auth.uid()) and u.ativo
  );
$$;

create function interno.eh_coordenacao_geral()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from acesso.usuarios u
     where u.auth_user_id = (select auth.uid()) and u.ativo and u.papel = 'coordenacao_geral'
  );
$$;

-- Colunas padrão: o banco preenche a partir de auth.uid(); o cliente não as define.
create function interno.preencher_colunas_padrao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
    new.criado_por := interno.usuario_atual_id();
    new.atualizado_em := null;
    new.atualizado_por := null;
  else
    new.criado_em := old.criado_em;
    new.criado_por := old.criado_por;
    new.atualizado_em := now();
    new.atualizado_por := interno.usuario_atual_id();
  end if;
  return new;
end;
$$;

create trigger colunas_padrao
  before insert or update on acesso.usuarios
  for each row execute function interno.preencher_colunas_padrao();

-- Vínculo com o Supabase Auth: a coordenação geral cadastra a pessoa aqui e a convida pelo Auth;
-- a conta é ligada pelo e-mail quando ele está confirmado e a linha ainda não tem conta. E-mail não
-- confirmado não liga (senão alguém criaria conta com o e-mail de outra pessoa).
create function interno.vincular_conta_do_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;
  update acesso.usuarios u
     set auth_user_id = new.id
   where u.email = lower(new.email)
     and u.auth_user_id is null;
  return new;
end;
$$;

create trigger vincular_conta_do_auth
  after insert or update of email_confirmed_at on auth.users
  for each row execute function interno.vincular_conta_do_auth();

-- Quem entra pelo cadastro do Auth antes de existir em acesso.usuarios: liga quando a linha nasce.
create function interno.vincular_ao_cadastrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.auth_user_id is null then
    select a.id into new.auth_user_id
      from auth.users a
     where lower(a.email) = new.email
       and a.email_confirmed_at is not null
       and not exists (select 1 from acesso.usuarios o where o.auth_user_id = a.id);
  end if;
  return new;
end;
$$;

create trigger vincular_ao_cadastrar
  before insert on acesso.usuarios
  for each row execute function interno.vincular_ao_cadastrar();

-- Funções de `interno` não são executáveis por padrão; cada uma recebe grant explícito.
revoke all on all functions in schema interno from public, anon, authenticated;
grant execute on function
  interno.usuario_atual_id(), interno.usuario_ativo(), interno.eh_coordenacao_geral()
  to authenticated, service_role;

-- Grants por coluna: `auth_user_id` e as colunas padrão só mudam pelos triggers.
revoke all on all tables in schema acesso from public, anon, authenticated;
grant select on acesso.usuarios to authenticated;
grant insert (nome, email, papel, crp, ativo) on acesso.usuarios to authenticated;
grant update (nome, email, papel, crp, ativo) on acesso.usuarios to authenticated;
grant all on acesso.usuarios to service_role;

alter table acesso.usuarios enable row level security;
alter table acesso.usuarios force row level security;

-- Cada um lê a própria linha; a coordenação geral lê e altera todas.
create policy le_propria_ou_coordenacao_geral on acesso.usuarios
  for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select interno.eh_coordenacao_geral()));

create policy coordenacao_geral_insere on acesso.usuarios
  for insert to authenticated
  with check ((select interno.eh_coordenacao_geral()));

create policy coordenacao_geral_altera on acesso.usuarios
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()))
  with check ((select interno.eh_coordenacao_geral()));
