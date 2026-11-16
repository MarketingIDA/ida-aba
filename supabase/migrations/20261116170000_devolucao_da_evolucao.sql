-- Devolução pela coordenação geral (E13, P2): a coordenação geral devolve uma evolução concluída,
-- com o motivo, enquanto o arquivo do mês não foi enviado. A evolução volta para "em conferência"
-- e não conclui de novo até o coordenador da carteira marcar a devolução como resolvida.
--
-- Como no resto, tudo passa pela Data API com grants por coluna, RLS e triggers; nenhuma função
-- security definer fica exposta. Devolver é gravar uma linha em `evolucao.devolucoes` com a
-- evolução e o motivo; resolver é marcar `resolvida`. Quem e quando vêm do banco. Nada se apaga.
-- Recusas novas (errcode 23514): `devolucao_so_de_concluida`, `devolucao_aberta` e
-- `devolucao_resolvida`.

-- ---------------------------------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------------------------------
-- Sem trigger de auditoria: a linha é o registro da devolução, e o motivo, que pode citar a saúde
-- do assistido, não se duplica. Os nomes ficam gravados porque o coordenador não lê a linha de
-- outra pessoa em `acesso.usuarios`.
create table evolucao.devolucoes (
  id bigint generated always as identity primary key,
  evolucao_id uuid not null references evolucao.evolucoes (id),
  motivo text not null check (length(btrim(motivo)) between 10 and 1000),
  devolvida_em timestamptz not null default now(),
  devolvida_por bigint not null references acesso.usuarios (id),
  devolvida_por_nome text not null,
  resolvida boolean not null default false,
  resolvida_em timestamptz,
  resolvida_por bigint references acesso.usuarios (id),
  resolvida_por_nome text,
  check (resolvida = (resolvida_em is not null)),
  check (resolvida = (resolvida_por is not null))
);

-- Uma devolução em aberto por evolução; a atual é a de maior `id`.
create unique index devolucoes_aberta_idx on evolucao.devolucoes (evolucao_id) where not resolvida;
create index devolucoes_evolucao_idx on evolucao.devolucoes (evolucao_id, id desc);
create index devolucoes_devolvida_por_idx on evolucao.devolucoes (devolvida_por);
create index devolucoes_resolvida_por_idx on evolucao.devolucoes (resolvida_por);

comment on table evolucao.devolucoes is
  'Devoluções de evoluções concluídas pela coordenação geral, com o motivo e a resolução (E13).';

-- ---------------------------------------------------------------------------------------------
-- 2. Triggers
-- ---------------------------------------------------------------------------------------------
-- Devolver: só a coordenação geral, e só a evolução concluída (a enviada não volta). A linha da
-- evolução fica travada até o fim: o envio do arquivo do mês não passa no meio.
create function interno.devolver_evolucao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu bigint := interno.usuario_atual_id();
  atual evolucao.situacao;
begin
  if eu is null or not interno.eh_coordenacao_geral() then
    raise exception 'Só a coordenação geral devolve uma evolução.' using errcode = '42501';
  end if;
  select e.situacao into atual from evolucao.evolucoes e where e.id = new.evolucao_id for update;
  if atual is distinct from 'concluida' then
    raise exception 'Só a evolução concluída, antes do envio do arquivo do mês, pode ser devolvida.'
      using errcode = '23514', hint = 'devolucao_so_de_concluida';
  end if;
  new.motivo := btrim(new.motivo);
  new.devolvida_em := now();
  new.devolvida_por := eu;
  select u.nome into new.devolvida_por_nome from acesso.usuarios u where u.id = eu;
  new.resolvida := false;
  new.resolvida_em := null;
  new.resolvida_por := null;
  new.resolvida_por_nome := null;
  return new;
end;
$$;

create trigger devolver_evolucao
  before insert on evolucao.devolucoes
  for each row execute function interno.devolver_evolucao();

-- Depois de gravar: a evolução volta para "em conferência" (`mudar_situacao` limpa a conclusão).
-- As partes seguem conferidas; a que o coordenador editar volta para "a conferir" (E08).
create function interno.voltar_para_conferencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update evolucao.evolucoes set situacao = 'em_conferencia' where id = new.evolucao_id;
  return null;
end;
$$;

create trigger voltar_para_conferencia
  after insert on evolucao.devolucoes
  for each row execute function interno.voltar_para_conferencia();

-- Resolver: quem e quando vêm do banco, e a devolução resolvida não reabre. As outras colunas não
-- têm grant de alteração na API.
create function interno.resolver_devolucao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu bigint := interno.usuario_atual_id();
begin
  if old.resolvida and not new.resolvida then
    raise exception 'A devolução já foi resolvida.'
      using errcode = '23514', hint = 'devolucao_resolvida';
  end if;
  if new.resolvida and not old.resolvida then
    new.resolvida_em := now();
    new.resolvida_por := eu;
    select u.nome into new.resolvida_por_nome from acesso.usuarios u where u.id = eu;
  else
    new.resolvida_em := old.resolvida_em;
    new.resolvida_por := old.resolvida_por;
    new.resolvida_por_nome := old.resolvida_por_nome;
  end if;
  return new;
end;
$$;

create trigger resolver_devolucao
  before update on evolucao.devolucoes
  for each row execute function interno.resolver_devolucao();

revoke all on function
  interno.devolver_evolucao(), interno.voltar_para_conferencia(), interno.resolver_devolucao()
  from public, anon, authenticated;

-- A conclusão, como antes, e a devolução em aberto bloqueia.
create or replace function interno.conferir_conclusao(p_evolucao uuid, p_assistido bigint)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  texto jsonb;
  metas jsonb;
begin
  if exists (
    select 1 from evolucao.devolucoes d where d.evolucao_id = p_evolucao and not d.resolvida
  ) then
    raise exception 'A evolução foi devolvida; marque a devolução como resolvida antes de concluir.'
      using errcode = '23514', hint = 'devolucao_aberta';
  end if;
  if exists (select 1 from evolucao.partes p where p.evolucao_id = p_evolucao and not p.conferida) then
    raise exception 'Confira as 4 partes antes de concluir.'
      using errcode = '23514', hint = 'partes_a_conferir';
  end if;
  if not exists (
    select 1 from cadastro.assistidos a where a.id = p_assistido and a.plano_id is not null
  ) then
    raise exception 'O assistido está sem plano de saúde no cadastro.'
      using errcode = '23514', hint = 'assistido_sem_plano';
  end if;
  select v.conteudo into texto from evolucao.versoes v
   where v.evolucao_id = p_evolucao and v.numero = 2 order by v.id desc limit 1;
  if coalesce(interno.linhas_do_texto(texto), 0) < 7 then
    raise exception 'O texto da evolução tem menos de 7 linhas.'
      using errcode = '23514', hint = 'texto_curto';
  end if;
  select v.conteudo into metas from evolucao.versoes v
   where v.evolucao_id = p_evolucao and v.numero = 4 order by v.id desc limit 1;
  if coalesce(jsonb_array_length(metas -> 'metas'), 0) < 4 then
    raise exception 'São precisas 4 metas ou mais para o mês atual.'
      using errcode = '23514', hint = 'poucas_metas_do_mes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Grants e RLS
-- ---------------------------------------------------------------------------------------------
-- O cliente manda a evolução e o motivo ao devolver, e só `resolvida` ao resolver. Sem DELETE.
revoke all on evolucao.devolucoes from public, anon, authenticated;
grant select, insert (evolucao_id, motivo), update (resolvida)
  on evolucao.devolucoes to authenticated;
grant all on evolucao.devolucoes to service_role;

alter table evolucao.devolucoes enable row level security;
alter table evolucao.devolucoes force row level security;

-- Lê quem lê a evolução, menos contas médicas, como nas partes e nas versões.
create policy segue_a_evolucao on evolucao.devolucoes
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
create policy coordenacao_geral_devolve on evolucao.devolucoes
  for insert to authenticated
  with check ((select interno.eh_coordenacao_geral()));
create policy coordenador_resolve on evolucao.devolucoes
  for update to authenticated
  using (evolucao_id in (select interno.evolucoes_do_usuario()))
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));

-- ---------------------------------------------------------------------------------------------
-- 4. As leituras para as telas
-- ---------------------------------------------------------------------------------------------
-- A evolução inteira passa a trazer as devoluções, da mais nova para a mais antiga, e se quem
-- chama pode devolver (a coordenação geral, com a evolução concluída).
create or replace function evolucao.evolucao_completa(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'codigo', e.codigo, 'mes_ref', e.mes_ref, 'situacao', e.situacao,
    'origem', e.origem, 'concluida_em', e.concluida_em,
    'periodo_inicio', e.periodo_inicio, 'periodo_fim', e.periodo_fim,
    'assistido_id', e.assistido_id,
    'assistido', a.nome, 'plano', p.nome, 'unidade', u.nome, 'turno', c.turno,
    'coordenador', co.nome,
    'editavel', e.assistido_id in (select interno.assistidos_do_usuario()),
    'pode_devolver', (select interno.eh_coordenacao_geral()) and e.situacao = 'concluida',
    'partes', (
      select jsonb_agg(jsonb_build_object(
               'numero', pt.numero, 'conferida_em', pt.conferida_em, 'conferida_por', pu.nome)
             order by pt.numero)
        from evolucao.partes pt
        left join acesso.usuarios pu on pu.id = pt.conferida_por
       where pt.evolucao_id = e.id),
    'versoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'numero', v.numero, 'conteudo', v.conteudo, 'autor', v.autor,
               'criado_em', v.criado_em, 'criado_por', v.nome))
        from (
          select distinct on (vs.numero) vs.numero, vs.conteudo, vs.autor, vs.criado_em, vu.nome
            from evolucao.versoes vs
            left join acesso.usuarios vu on vu.id = vs.criado_por
           where vs.evolucao_id = e.id
           order by vs.numero, vs.id desc
        ) v), '[]'::jsonb),
    'devolucoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'motivo', d.motivo,
               'devolvida_em', d.devolvida_em, 'devolvida_por', d.devolvida_por_nome,
               'resolvida_em', d.resolvida_em, 'resolvida_por', d.resolvida_por_nome)
             order by d.id desc)
        from evolucao.devolucoes d
       where d.evolucao_id = e.id), '[]'::jsonb)
  )
    from evolucao.evolucoes e
    join cadastro.assistidos a on a.id = e.assistido_id
    join cadastro.unidades u on u.id = a.unidade_id
    join cadastro.carteiras c on c.id = a.carteira_id
    left join cadastro.planos p on p.id = a.plano_id
    left join acesso.usuarios co on co.id = c.coordenador_id
   where e.id = p_id;
$$;

-- A lista do mês passa a dizer qual evolução está devolvida, à espera do coordenador. A função
-- nasce de novo porque ganhou uma coluna.
drop function evolucao.evolucoes_do_mes(date, bigint);

create function evolucao.evolucoes_do_mes(p_mes date, p_coordenador_id bigint default null)
returns table (
  assistido_id bigint,
  nome text,
  plano text,
  unidade_sigla text,
  unidade_nome text,
  turno cadastro.turno,
  coordenador_id bigint,
  evolucao_id uuid,
  codigo text,
  situacao evolucao.situacao,
  origem evolucao.origem,
  partes_conferidas integer,
  devolvida boolean
)
language sql
stable
security invoker
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
   order by a.nome;
$$;

revoke all on function evolucao.evolucoes_do_mes(date, bigint) from public, anon;
grant execute on function evolucao.evolucoes_do_mes(date, bigint) to authenticated, service_role;
