-- Evolução mensal: uma por assistido e mês da evolução (E01), com o período analisado calculado
-- (E18), o código (E16) e as 4 partes conferidas uma a uma (E08). Nesta etapa só há leitura:
-- criar e alterar evoluções entra com a importação do Tita e o rascunho da IA, por funções.

create type evolucao.situacao as enum ('em_conferencia', 'concluida', 'enviada'); -- E13
create type evolucao.origem as enum ('tita', 'manual'); -- E26

create table evolucao.evolucoes (
  id uuid primary key default gen_random_uuid(), -- uuid: vai para caminho de arquivo no Storage
  assistido_id bigint not null references cadastro.assistidos (id),
  mes_ref date not null check (extract(day from mes_ref) = 1), -- 2026-11-01 = evolução de novembro
  periodo_inicio date generated always as ((mes_ref - interval '1 month')::date) stored, -- E18
  periodo_fim date generated always as (mes_ref - 1) stored,
  origem evolucao.origem not null,
  situacao evolucao.situacao not null default 'em_conferencia',
  codigo text not null unique, -- E16, dado pelo banco: UNI-AAMM-NNN-EV
  concluida_em timestamptz,
  enviada_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint,
  unique (assistido_id, mes_ref),
  check ((situacao = 'em_conferencia') or concluida_em is not null),
  check ((situacao = 'enviada') = (enviada_em is not null))
);

create index evolucoes_mes_idx on evolucao.evolucoes (mes_ref);

comment on column evolucao.evolucoes.mes_ref is
  'Mês da evolução (dia 1º). O período analisado é o mês anterior inteiro (E18).';

-- Código da evolução (E16): sigla da unidade, ano e mês da evolução e a sequência do assistido.
-- Calculado na criação e fixo depois, mesmo se o assistido mudar de unidade.
create function interno.codigo_da_evolucao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.codigo := old.codigo;
    return new;
  end if;
  select u.sigla || '-' || to_char(new.mes_ref, 'YYMM') || '-'
         || lpad(a.sequencia::text, 3, '0') || '-EV'
    into new.codigo
    from cadastro.assistidos a
    join cadastro.unidades u on u.id = a.unidade_id
   where a.id = new.assistido_id;
  return new;
end;
$$;

revoke all on function interno.codigo_da_evolucao() from public, anon, authenticated;

create trigger codigo_da_evolucao
  before insert or update on evolucao.evolucoes
  for each row execute function interno.codigo_da_evolucao();

create table evolucao.partes (
  evolucao_id uuid not null references evolucao.evolucoes (id),
  numero smallint not null check (numero between 1 and 4), -- 1 identificação … 4 metas do mês
  conferida boolean not null default false,
  conferida_em timestamptz,
  conferida_por bigint references acesso.usuarios (id),
  primary key (evolucao_id, numero),
  check (conferida = (conferida_em is not null))
);

create index partes_conferida_por_idx on evolucao.partes (conferida_por);

create trigger colunas_padrao
  before insert or update on evolucao.evolucoes
  for each row execute function interno.preencher_colunas_padrao();
create trigger auditoria
  after insert or update or delete on evolucao.evolucoes
  for each row execute function interno.registrar_auditoria();
create trigger auditoria
  after insert or update or delete on evolucao.partes
  for each row execute function interno.registrar_auditoria('evolucao_id', 'numero');

-- Só leitura nesta etapa; a escrita entra por funções nas próximas.
revoke all on all tables in schema evolucao from public, anon, authenticated;
grant select on evolucao.evolucoes, evolucao.partes to authenticated;
grant all on evolucao.evolucoes, evolucao.partes to service_role;

alter table evolucao.evolucoes enable row level security;
alter table evolucao.evolucoes force row level security;
alter table evolucao.partes enable row level security;
alter table evolucao.partes force row level security;

-- O coordenador lê as evoluções dos assistidos da carteira dele; a coordenação geral lê todas.
-- Contas médicas recebe o arquivo do mês (E24), que entra numa etapa própria.
create policy carteira_ou_coordenacao_geral_le on evolucao.evolucoes
  for select to authenticated
  using (
    (select interno.eh_coordenacao_geral())
    or assistido_id in (select interno.assistidos_do_usuario())
  );

create policy segue_a_evolucao on evolucao.partes
  for select to authenticated
  using (evolucao_id in (select e.id from evolucao.evolucoes e));

-- Lista do mês: cada assistido da carteira com a evolução do mês, se houver. security invoker:
-- o RLS das tabelas vale para quem chama.
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
  partes_conferidas integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id, a.nome, p.nome, u.sigla, u.nome, c.turno, c.coordenador_id,
         e.id, e.codigo, e.situacao, e.origem,
         (select count(*)::integer from evolucao.partes pt
           where pt.evolucao_id = e.id and pt.conferida)
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
