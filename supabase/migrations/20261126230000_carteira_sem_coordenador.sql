-- A carteira nasce só com unidade e turno; o coordenador entra depois, no cadastro da pessoa
-- (pedido de 26/11/2026). A mesma unidade e o mesmo turno podem ter mais de um coordenador, cada
-- um com os seus assistidos e o seu arquivo do mês.
--
-- O desenho: cada linha de `cadastro.carteiras` é a carteira de UM coordenador numa unidade e num
-- turno, ou a carteira ainda sem coordenador. Atribuir a primeira pessoa preenche a linha vazia;
-- a segunda pessoa no mesmo turno ganha outra linha. Como o assistido, a evolução e o arquivo do
-- mês já apontam para a linha, nada disso muda: quem coordena vê só o que é da linha dele.

-- ---------------------------------------------------------------------------------------------
-- 1. Coordenador opcional, e a unicidade nova
-- ---------------------------------------------------------------------------------------------
alter table cadastro.carteiras alter column coordenador_id drop not null;

drop index cadastro.carteiras_unidade_turno_ativa;

-- A mesma pessoa não tem duas carteiras ativas na mesma unidade e turno.
create unique index carteiras_unidade_turno_coordenador_ativa
  on cadastro.carteiras (unidade_id, turno, coordenador_id)
  where ativa and coordenador_id is not null;

-- Sem coordenador, uma carteira ativa por unidade e turno.
create unique index carteiras_unidade_turno_sem_coordenador_ativa
  on cadastro.carteiras (unidade_id, turno)
  where ativa and coordenador_id is null;

-- Com coordenador, ele precisa ter o papel; sem coordenador, a carteira passa.
create or replace function interno.conferir_coordenador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.coordenador_id is not null and not exists (
    select 1 from acesso.usuarios u where u.id = new.coordenador_id and u.papel = 'coordenador'
  ) then
    raise exception 'A carteira precisa de um usuário com papel de coordenador.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. As carteiras que faltam: manhã e tarde em cada unidade ativa; Ipojuca, só integral
-- ---------------------------------------------------------------------------------------------
insert into cadastro.carteiras (unidade_id, turno)
select u.id, t.turno
  from cadastro.unidades u
  join (values ('manha'::cadastro.turno), ('tarde'), ('integral')) as t (turno)
    on (u.sigla = 'IPO') = (t.turno = 'integral')
 where u.ativa
   and not exists (
     select 1 from cadastro.carteiras c
      where c.unidade_id = u.id and c.turno = t.turno and c.ativa
   );
