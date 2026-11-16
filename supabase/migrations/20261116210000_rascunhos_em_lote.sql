-- Rascunhos da Tita numa carteira, em lote (E28). A primeira sincronização traz todos os
-- favorecidos como rascunho, sem carteira; passar um a um pelo formulário não dá. A coordenação
-- geral marca vários na tela de Assistidos, escolhe uma carteira ativa e confirma.
--
-- Regras:
-- * Uma chamada, um UPDATE só: ou todos os marcados entram, ou nenhum.
-- * Cada um leva a unidade da carteira, que vem do banco e não da tela. Quem muda de unidade ganha
--   outro número nela (o trigger `numerar_assistido`); o rascunho ainda não tem evolução.
-- * Só rascunho entra: quem já tem carteira fica como está. Rascunho sem gênero também fica de fora
--   (o check `assistido_na_carteira_tem_genero` o recusaria): a coordenação geral escolhe o gênero
--   no cadastro de cada um. A função devolve quantos entraram e quantos ficaram de fora, e por quê.
-- * security invoker: valem para quem chama o RLS, os grants por coluna, as colunas padrão e a
--   auditoria (uma linha por assistido). Nada se apaga.

create function cadastro.por_rascunhos_na_carteira(p_assistidos bigint[], p_carteira_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unidade bigint;
  v_postos integer;
  v_sem_genero integer;
  v_com_carteira integer;
begin
  if not (select interno.eh_coordenacao_geral()) then
    raise exception 'Só a coordenação geral põe assistidos na carteira.' using errcode = '42501';
  end if;

  -- O trigger só confere a carteira do assistido ativo; aqui vale para todos.
  select c.unidade_id into v_unidade
    from cadastro.carteiras c
   where c.id = p_carteira_id and c.ativa;
  if not found then
    raise exception 'A carteira escolhida está desativada.'
      using errcode = '23514', hint = 'carteira_desativada';
  end if;

  with postos as (
    update cadastro.assistidos a
       set carteira_id = p_carteira_id, unidade_id = v_unidade
     where a.id = any(p_assistidos) and a.carteira_id is null and a.genero is not null
    returning a.id
  )
  select count(*) into v_postos from postos;

  -- Depois do UPDATE: o que ainda está sem carteira é o rascunho sem gênero; o que tem carteira e
  -- não entrou agora já tinha uma.
  select count(*) filter (where a.carteira_id is null and a.genero is null),
         count(*) filter (where a.carteira_id is not null) - v_postos
    into v_sem_genero, v_com_carteira
    from cadastro.assistidos a
   where a.id = any(p_assistidos);

  return jsonb_build_object(
    'postos', v_postos, 'sem_genero', v_sem_genero, 'com_carteira', v_com_carteira);
end;
$$;

comment on function cadastro.por_rascunhos_na_carteira(bigint[], bigint) is
  'Põe os rascunhos da Tita numa carteira ativa, com a unidade dela. Só a coordenação geral.';

revoke all on function cadastro.por_rascunhos_na_carteira(bigint[], bigint)
  from public, anon, authenticated;
grant execute on function cadastro.por_rascunhos_na_carteira(bigint[], bigint) to authenticated;
