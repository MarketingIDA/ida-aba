-- O coordenador cadastra e altera assistidos como a coordenação geral (pedido de 26/11/2026):
-- de qualquer carteira e unidade. Para isso ele passa a ler todos os assistidos.
-- O que segue por carteira não muda: evoluções, metas e relatórios usam
-- `interno.assistidos_do_usuario()`, e a lista do mês (`evolucao.evolucoes_do_mes`) passa a
-- recortar a carteira do coordenador, para ele não ver os assistidos das outras como "sem evolução".

create function interno.eh_coordenador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from acesso.usuarios u
     where u.auth_user_id = (select auth.uid()) and u.ativo and u.papel = 'coordenador'
  );
$$;

revoke all on function interno.eh_coordenador() from public;
grant execute on function interno.eh_coordenador() to authenticated, service_role;

drop policy carteira_ou_coordenacao_geral_le on cadastro.assistidos;
drop policy coordenacao_geral_insere on cadastro.assistidos;
drop policy coordenacao_geral_altera on cadastro.assistidos;

create policy coordenacao_le on cadastro.assistidos
  for select to authenticated
  using ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()));

create policy coordenacao_insere on cadastro.assistidos
  for insert to authenticated
  with check ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()));

create policy coordenacao_altera on cadastro.assistidos
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()))
  with check ((select interno.eh_coordenacao_geral()) or (select interno.eh_coordenador()));

create or replace function evolucao.evolucoes_do_mes(p_mes date, p_coordenador_id bigint default null)
returns table (
  assistido_id bigint, nome text, plano text, unidade_sigla text, unidade_nome text,
  turno cadastro.turno, coordenador_id bigint, evolucao_id uuid, codigo text,
  situacao evolucao.situacao, origem evolucao.origem, partes_conferidas integer,
  devolvida boolean
)
language sql
stable
set search_path = ''
as $$
  select a.id, a.nome, p.nome, u.sigla, u.nome, c.turno, c.coordenador_id,
         e.id, e.codigo, e.situacao, e.origem,
         (select count(*)::integer from evolucao.partes pt
           where pt.evolucao_id = e.id and pt.conferida),
         exists (select 1 from evolucao.devolucoes d
                  where d.evolucao_id = e.id and not d.resolvida)
    from cadastro.assistidos a
    join cadastro.carteiras c on c.id = a.carteira_id
    join cadastro.unidades u on u.id = a.unidade_id
    left join cadastro.planos p on p.id = a.plano_id
    left join evolucao.evolucoes e on e.assistido_id = a.id and e.mes_ref = p_mes
   where (a.ativo or e.id is not null)
     and (p_coordenador_id is null or c.coordenador_id = p_coordenador_id)
     and ((select interno.eh_coordenacao_geral())
          or c.id in (select interno.carteiras_do_usuario()))
   order by a.nome;
$$;
