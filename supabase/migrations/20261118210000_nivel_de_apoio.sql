-- Nível de apoio (E27): a IA lê, na Análise do Atendimento de cada sessão do período, o nível de
-- apoio de cada meta do cadastro que tem programa, em 5 degraus: 1 ajuda física total, 2 ajuda
-- física parcial, 3 dica gestual ou modelo, 4 dica verbal, 5 independente. A sessão em que o
-- programa aparece sem o nível fica com o nível nulo: trabalhada, mas fora da escada.
--
-- A leitura é da Edge Function `ler-niveis`, chamada logo depois da importação do PDF do Tita. Ela
-- grava pela RPC `evolucao.gravar_niveis`, que só o servidor executa: numa transação, troca os
-- níveis da evolução e registra a situação da leitura. Importar de novo apaga os níveis da
-- importação anterior, para o gráfico nunca mostrar níveis de um PDF que não vale mais.
--
-- Uma linha por meta e dia: um dia do assistido pertence a uma evolução só (E20), e as sessões do
-- mesmo dia já chegam juntas, com o nível de mais apoio. Contas médicas não lê nada daqui.

-- ---------------------------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------------------------
create table evolucao.niveis_de_apoio (
  meta_id bigint not null references cadastro.metas (id),
  data date not null,
  evolucao_id uuid not null references evolucao.evolucoes (id),
  nivel smallint check (nivel between 1 and 5), -- nulo: o programa aparece sem o nível
  trecho text not null check (length(btrim(trecho)) between 1 and 1000), -- já sem o nome (E05)
  primary key (meta_id, data)
);

create index niveis_de_apoio_evolucao_idx on evolucao.niveis_de_apoio (evolucao_id);

comment on table evolucao.niveis_de_apoio is
  'Nível de apoio lido pela IA para cada meta em cada dia de sessão (E27), com o trecho da análise.';

-- A leitura da importação atual de cada evolução: lida, sem metas com programa, ou falhou. Sem
-- linha, os níveis ainda não foram lidos.
create table evolucao.leituras_de_nivel (
  evolucao_id uuid primary key references evolucao.evolucoes (id),
  importacao_id bigint not null references evolucao.importacoes (id),
  situacao text not null check (situacao in ('lida', 'sem_metas', 'falhou')),
  dias smallint not null default 0 check (dias >= 0), -- dias com nível lido
  metas smallint not null default 0 check (metas >= 0), -- metas com algum nível lido
  lida_em timestamptz not null default now()
);

create index leituras_de_nivel_importacao_idx on evolucao.leituras_de_nivel (importacao_id);

comment on table evolucao.leituras_de_nivel is
  'Situação da leitura do nível de apoio da importação atual de cada evolução (E27).';

-- ---------------------------------------------------------------------------------------------
-- 2. Importar de novo apaga a leitura anterior
-- ---------------------------------------------------------------------------------------------
create function interno.apagar_niveis_da_importacao_anterior()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from evolucao.niveis_de_apoio n where n.evolucao_id = new.evolucao_id;
  delete from evolucao.leituras_de_nivel l where l.evolucao_id = new.evolucao_id;
  return null;
end;
$$;

create trigger apagar_niveis_da_importacao_anterior
  after insert on evolucao.importacoes
  for each row execute function interno.apagar_niveis_da_importacao_anterior();

revoke all on function interno.apagar_niveis_da_importacao_anterior()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. A gravação da leitura (só o servidor)
-- ---------------------------------------------------------------------------------------------
-- p_niveis: [{"meta_id": 1, "data": "2026-10-05", "nivel": 3, "trecho": "…"}]. Recusa a leitura de
-- uma importação que já não é a atual (o coordenador importou de novo enquanto a IA lia), meta de
-- outro assistido e dia fora do período analisado.
create function evolucao.gravar_niveis(p_importacao_id bigint, p_situacao text, p_niveis jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  ev record;
begin
  select e.id, e.assistido_id, e.periodo_inicio, e.periodo_fim into ev
    from evolucao.importacoes i
    join evolucao.evolucoes e on e.id = i.evolucao_id
   where i.id = p_importacao_id;
  if ev.id is null or p_importacao_id <> (
    select max(i.id) from evolucao.importacoes i where i.evolucao_id = ev.id
  ) then
    raise exception 'A importação já não é a atual.'
      using errcode = '23514', hint = 'leitura_desatualizada';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_niveis) as n(meta_id bigint, data date)
     where n.data not between ev.periodo_inicio and ev.periodo_fim
        or not exists (
          select 1 from cadastro.metas m where m.id = n.meta_id and m.assistido_id = ev.assistido_id
        )
  ) then
    raise exception 'Nível de meta de outro assistido ou de dia fora do período.'
      using errcode = '23514', hint = 'nivel_invalido';
  end if;

  -- A leitura que falhou não apaga os níveis que já valem: "Ler de novo" com a IA fora do ar
  -- deixa a leitura anterior como está (o PDF novo já chega sem níveis, pelo trigger).
  if p_situacao <> 'falhou' then
    delete from evolucao.niveis_de_apoio n where n.evolucao_id = ev.id;
    insert into evolucao.niveis_de_apoio (meta_id, data, evolucao_id, nivel, trecho)
      select n.meta_id, n.data, ev.id, n.nivel, btrim(n.trecho)
        from jsonb_to_recordset(p_niveis) as n(meta_id bigint, data date, nivel smallint, trecho text);
  end if;

  insert into evolucao.leituras_de_nivel (evolucao_id, importacao_id, situacao, dias, metas, lida_em)
    select ev.id, p_importacao_id, p_situacao,
           count(distinct n.data) filter (where n.nivel is not null),
           count(distinct n.meta_id) filter (where n.nivel is not null),
           now()
      from evolucao.niveis_de_apoio n where n.evolucao_id = ev.id
  on conflict (evolucao_id) do update
    set importacao_id = excluded.importacao_id, situacao = excluded.situacao,
        dias = excluded.dias, metas = excluded.metas, lida_em = excluded.lida_em;
end;
$$;

revoke all on function evolucao.gravar_niveis(bigint, text, jsonb) from public, anon, authenticated;
grant execute on function evolucao.gravar_niveis(bigint, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------
-- 4. Grants e RLS: o cliente só lê
-- ---------------------------------------------------------------------------------------------
revoke all on evolucao.niveis_de_apoio, evolucao.leituras_de_nivel from public, anon, authenticated;
grant select on evolucao.niveis_de_apoio, evolucao.leituras_de_nivel to authenticated;
grant all on evolucao.niveis_de_apoio, evolucao.leituras_de_nivel to service_role;

alter table evolucao.niveis_de_apoio enable row level security;
alter table evolucao.niveis_de_apoio force row level security;
alter table evolucao.leituras_de_nivel enable row level security;
alter table evolucao.leituras_de_nivel force row level security;

-- Seguem a evolução (o RLS de `evolucoes` vale na subconsulta), menos para contas médicas.
create policy segue_a_evolucao on evolucao.niveis_de_apoio
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
create policy segue_a_evolucao on evolucao.leituras_de_nivel
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
