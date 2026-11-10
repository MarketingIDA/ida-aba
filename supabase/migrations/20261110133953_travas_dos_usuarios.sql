-- Travas dos usuários, antes da tela de pessoas: a coordenação geral passa a cadastrar e alterar
-- quem usa o sistema, e o banco garante as regras que a tela não pode garantir sozinha.
--
-- Cada regra recusa com errcode 23514 (check_violation) e um `hint` fixo, que a tela traduz em
-- mensagem própria: `ultima_coordenacao_geral`, `email_com_conta`, `coordenador_com_carteira`.
--
-- Desativar continua sempre possível (menos a última coordenação geral): cortar o acesso de quem
-- sai tem de valer na hora, mesmo com carteira ativa. A carteira se passa depois.

-- Funções novas de `interno` nascem sem EXECUTE para public; cada uma recebe grant explícito.
alter default privileges in schema interno revoke execute on functions from public;

-- ---------------------------------------------------------------------------------------------
-- 1. Nunca fica sem coordenação geral ativa
-- ---------------------------------------------------------------------------------------------
-- AFTER ROW: roda depois do comando inteiro, então um UPDATE de várias linhas é conferido no
-- estado final. O lock consultivo põe em fila duas desativações simultâneas: a segunda conta de
-- novo (função VOLATILE, snapshot novo a cada comando) e vê a primeira já gravada.
create function interno.manter_coordenacao_geral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.papel = 'coordenacao_geral' and new.ativo then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('acesso.usuarios.coordenacao_geral', 0));
  if not exists (
    select 1 from acesso.usuarios u where u.papel = 'coordenacao_geral' and u.ativo
  ) then
    raise exception 'O sistema precisa de ao menos uma coordenação geral ativa.'
      using errcode = '23514', hint = 'ultima_coordenacao_geral';
  end if;
  return null;
end;
$$;

create trigger manter_coordenacao_geral
  after update of papel, ativo or delete on acesso.usuarios
  for each row
  when (old.papel = 'coordenacao_geral' and old.ativo)
  execute function interno.manter_coordenacao_geral();

-- ---------------------------------------------------------------------------------------------
-- 2. E-mail travado depois da conta; papel travado com carteira ativa
-- ---------------------------------------------------------------------------------------------
-- O e-mail de quem já tem conta é o do login: mudar só aqui deixaria os dois diferentes. Antes da
-- conta, corrigir o e-mail é livre (e liga a conta, se ela já existir; ver o item 3).
-- O coordenador com carteira ativa só muda de papel depois que a carteira passa para outro
-- coordenador; senão a carteira ficaria com quem não é coordenador.
create function interno.conferir_alteracao_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger conferir_alteracao_de_usuario
  before update on acesso.usuarios
  for each row execute function interno.conferir_alteracao_de_usuario();

-- O outro lado da mesma regra: a carteira trava a linha do coordenador (FOR SHARE) enquanto
-- confere o papel. Uma troca de papel ao mesmo tempo espera e depois vê a carteira nova.
create or replace function interno.conferir_coordenador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from acesso.usuarios u
   where u.id = new.coordenador_id and u.papel = 'coordenador'
     for share;
  if not found then
    raise exception 'A carteira precisa de um usuário com papel de coordenador.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Corrigir o e-mail de quem ainda não tem conta liga a conta que já existe
-- ---------------------------------------------------------------------------------------------
-- A função `interno.vincular_ao_cadastrar` não muda: ela só age enquanto a linha não tem conta.
drop trigger vincular_ao_cadastrar on acesso.usuarios;
create trigger vincular_ao_cadastrar
  before insert or update of email on acesso.usuarios
  for each row execute function interno.vincular_ao_cadastrar();

revoke all on function
  interno.manter_coordenacao_geral(), interno.conferir_alteracao_de_usuario()
  from public, anon, authenticated;
