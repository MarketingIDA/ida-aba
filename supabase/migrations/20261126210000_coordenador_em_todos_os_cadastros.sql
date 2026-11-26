-- O coordenador passa a cadastrar e alterar tudo o que a coordenação geral cadastra (pedido de
-- 26/11/2026): unidades, planos, carteiras, termos inadequados e pessoas. Os assistidos já eram
-- dele desde `20261126170000`. O que continua só da coordenação geral: a curadoria das dicas, a
-- devolução de evolução, a sincronização da Tita e a auditoria.
--
-- Uma trava nova acompanha: o coordenador não muda o próprio papel nem se desativa. Sem ela, quem
-- cadastra pessoas se promoveria sozinho a coordenação geral.

-- ---------------------------------------------------------------------------------------------
-- 1. Unidades, planos, carteiras e termos
-- ---------------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['unidades', 'planos', 'carteiras', 'termos_inadequados'] loop
    execute format('drop policy coordenacao_geral_insere on cadastro.%I', t);
    execute format('drop policy coordenacao_geral_altera on cadastro.%I', t);
    execute format(
      'create policy coordenacao_insere on cadastro.%I for insert to authenticated
         with check ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()))',
      t);
    execute format(
      'create policy coordenacao_altera on cadastro.%I for update to authenticated
         using ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()))
         with check ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()))',
      t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Pessoas
-- ---------------------------------------------------------------------------------------------
drop policy le_propria_ou_coordenacao_geral on acesso.usuarios;
drop policy coordenacao_geral_insere on acesso.usuarios;
drop policy coordenacao_geral_altera on acesso.usuarios;

-- Cada um lê a própria linha; a coordenação geral e o coordenador leem e alteram todas.
create policy le_propria_ou_coordenacao on acesso.usuarios
  for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or (select interno.eh_coordenacao_geral())
    or (select interno.eh_coordenador())
  );

create policy coordenacao_insere on acesso.usuarios
  for insert to authenticated
  with check ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()));

create policy coordenacao_altera on acesso.usuarios
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()))
  with check ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()));

-- A mesma função de antes, com a trava nova no começo. `auth.uid()` é nulo fora da API (a
-- sincronização e as migrações), e aí a trava não se aplica.
create or replace function interno.conferir_alteracao_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.auth_user_id = (select auth.uid())
     and old.papel = 'coordenador'
     and (new.papel is distinct from old.papel or new.ativo is distinct from old.ativo) then
    raise exception 'O coordenador não muda o próprio papel nem se desativa.'
      using errcode = '42501';
  end if;
  if old.auth_user_id is not null and new.email is distinct from old.email then
    raise exception 'O e-mail de quem já tem conta não muda pelo cadastro.'
      using errcode = '23514', hint = 'email_com_conta';
  end if;
  if old.papel = 'coordenador' and new.papel <> 'coordenador' and exists (
    select 1 from cadastro.carteiras c where c.coordenador_id = old.id and c.ativa
  ) then
    raise exception 'O coordenador tem carteira ativa; passe a carteira antes de mudar o papel.'
      using errcode = '23514', hint = 'coordenador_com_carteira';
  end if;
  return new;
end;
$$;
