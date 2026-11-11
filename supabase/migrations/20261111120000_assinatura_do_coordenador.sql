-- Assinatura do coordenador (E14, P14): a imagem da assinatura ou do carimbo que vai no fim do
-- arquivo do mês. Sem ela, o envio do arquivo bloqueia (etapa do envio).
--
-- O coordenador manda a imagem ao Storage, no bucket privado `assinaturas`, dentro da pasta com o
-- id dele, e grava aqui o caminho. Nada se sobrescreve nem se apaga. Uma assinatura nova vira um
-- objeto novo e uma linha nova, e a atual é a de maior `id`. Assim, o arquivo do mês enviado fica
-- com a assinatura da época.
--
-- Quem lê: o próprio coordenador e a coordenação geral. Contas médicas recebe a assinatura dentro
-- do arquivo do mês enviado (etapa do envio).

-- ---------------------------------------------------------------------------------------------
-- 1. Bucket privado: só imagem, até 2 MB
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assinaturas', 'assinaturas', false, 2097152,
        array['image/png', 'image/jpeg', 'image/webp']);

-- ---------------------------------------------------------------------------------------------
-- 2. Tabela
-- ---------------------------------------------------------------------------------------------
create table acesso.assinaturas (
  id bigint generated always as identity primary key,
  usuario_id bigint not null references acesso.usuarios (id),
  -- '<id do usuário>/<uuid>.<extensão>', no bucket `assinaturas`.
  caminho text not null unique
    check (caminho ~ '^[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'),
  criado_em timestamptz not null default now()
);

create index assinaturas_do_usuario on acesso.assinaturas (usuario_id, id desc);

comment on table acesso.assinaturas is
  'Assinatura ou carimbo de cada coordenador (E14). A atual é a de maior id; nada se apaga.';

-- Quem assina e quando vêm do banco. A imagem tem de estar na pasta de quem grava e já no Storage.
create function interno.gravar_assinatura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.usuario_id := interno.usuario_atual_id();
  new.criado_em := now();
  if new.usuario_id is null then
    raise exception 'Sem acesso ativo ao sistema.' using errcode = '42501';
  end if;
  if split_part(new.caminho, '/', 1) <> new.usuario_id::text then
    raise exception 'A imagem não está na pasta de quem assina.'
      using errcode = '23514', hint = 'assinatura_fora_da_pasta';
  end if;
  if not exists (
    select 1 from storage.objects o where o.bucket_id = 'assinaturas' and o.name = new.caminho
  ) then
    raise exception 'A imagem da assinatura não chegou ao servidor.'
      using errcode = '23514', hint = 'assinatura_sem_imagem';
  end if;
  return new;
end;
$$;

create trigger gravar_assinatura
  before insert on acesso.assinaturas
  for each row execute function interno.gravar_assinatura();

revoke all on function interno.gravar_assinatura() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Grants e RLS
-- ---------------------------------------------------------------------------------------------
-- O cliente manda só o caminho. Ninguém altera nem apaga pela API.
revoke all on acesso.assinaturas from public, anon, authenticated;
grant select, insert (caminho) on acesso.assinaturas to authenticated;
grant all on acesso.assinaturas to service_role;

alter table acesso.assinaturas enable row level security;
alter table acesso.assinaturas force row level security;

create policy propria_ou_coordenacao_geral_le on acesso.assinaturas
  for select to authenticated
  using (usuario_id = (select interno.usuario_atual_id()) or (select interno.eh_coordenacao_geral()));

-- Só quem coordena unidade grava a própria assinatura (a subconsulta lê a própria linha pelo RLS).
create policy coordenador_grava_a_propria on acesso.assinaturas
  for insert to authenticated
  with check (
    usuario_id = (select interno.usuario_atual_id())
    and exists (
      select 1 from acesso.usuarios u
       where u.id = (select interno.usuario_atual_id()) and u.papel = 'coordenador'
    )
  );

-- Storage: o coordenador envia só para a própria pasta; lê a própria pasta, e a coordenação geral
-- lê todas. Sem policy de update nem de delete: a imagem enviada não se troca nem se apaga.
create policy assinatura_coordenador_envia on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assinaturas'
    and (storage.foldername(name))[1] = (select interno.usuario_atual_id())::text
    and exists (
      select 1 from acesso.usuarios u
       where u.id = (select interno.usuario_atual_id()) and u.papel = 'coordenador'
    )
  );

create policy assinatura_propria_ou_coordenacao_geral_le on storage.objects
  for select to authenticated
  using (
    bucket_id = 'assinaturas'
    and ((storage.foldername(name))[1] = (select interno.usuario_atual_id())::text
         or (select interno.eh_coordenacao_geral()))
  );
