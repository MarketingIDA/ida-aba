-- Carteira desativada não guarda assistido ativo, antes da tela de assistidos.
--
-- Desativar a carteira libera a unidade e o turno para outra. Se ela ainda tivesse assistidos
-- ativos, eles continuariam visíveis para quem a coordenava, sem aparecer em carteira nenhuma da
-- tela. A regra vale dos dois lados, cada um com errcode 23514 e um `hint` fixo que a tela traduz:
--   `carteira_com_assistidos`: a carteira só se desativa depois que os assistidos ativos passam
--     para outra (no cadastro de cada um);
--   `carteira_desativada`: assistido ativo não entra nem volta para carteira desativada.
--
-- Os dois lados se cruzam na linha da carteira: o assistido a trava em FOR SHARE ao conferir, e a
-- desativação, que a trava para o UPDATE, só confere depois (AFTER ROW, função VOLATILE, snapshot
-- novo). Um cadastro de assistido e uma desativação ao mesmo tempo nunca passam os dois.

-- ---------------------------------------------------------------------------------------------
-- 1. A carteira com assistidos ativos não se desativa
-- ---------------------------------------------------------------------------------------------
create function interno.conferir_carteira_sem_assistidos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from cadastro.assistidos a where a.carteira_id = new.id and a.ativo
  ) then
    raise exception 'A carteira tem assistidos ativos; passe-os para outra antes de desativar.'
      using errcode = '23514', hint = 'carteira_com_assistidos';
  end if;
  return null;
end;
$$;

create trigger conferir_carteira_sem_assistidos
  after update of ativa on cadastro.carteiras
  for each row
  when (old.ativa and not new.ativa)
  execute function interno.conferir_carteira_sem_assistidos();

-- ---------------------------------------------------------------------------------------------
-- 2. Assistido ativo só em carteira ativa
-- ---------------------------------------------------------------------------------------------
create function interno.conferir_carteira_do_assistido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from cadastro.carteiras c
   where c.id = new.carteira_id and c.ativa
     for share;
  if not found then
    raise exception 'A carteira escolhida está desativada.'
      using errcode = '23514', hint = 'carteira_desativada';
  end if;
  return new;
end;
$$;

create trigger conferir_carteira_do_assistido
  before insert or update of carteira_id, ativo on cadastro.assistidos
  for each row
  when (new.ativo)
  execute function interno.conferir_carteira_do_assistido();

revoke all on function
  interno.conferir_carteira_sem_assistidos(), interno.conferir_carteira_do_assistido()
  from public, anon, authenticated;
