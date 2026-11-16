-- Importação do PDF do Tita (E02, E03, E18, E20): o coordenador importa, na evolução em
-- conferência, o Relatório de Evoluções Diárias do assistido. O PDF é lido no navegador e não é
-- guardado: chegam ao banco só os Dados do Favorecido e, de cada evolução diária, a data, o texto
-- da Análise do Atendimento e se foi falta. O resto do arquivo nunca sai do computador.
--
-- Importar é gravar uma linha em `evolucao.importacoes`; o resto é do banco, como nas outras
-- etapas (grants por coluna, RLS e triggers). O banco recusa o que daria prejuízo calado:
--   o favorecido do PDF não é o assistido da evolução;
--   o período avaliado do PDF não cobre o período analisado inteiro (E18);
--   a terapia do filtro não é ABA, ou o filtro de profissional não é "Todos" (E03).
-- Os alertas da E03 e da E19 (período maior, total diferente, datas de fora) ficam na tela.
--
-- Cada importação é uma linha nova; a atual é a de maior `id`. Os dias analisados (E20) são os da
-- importação atual: importar de novo troca os dias da mesma evolução.
-- Contas médicas não lê nada daqui: as análises diárias não vão no arquivo do mês.

-- ---------------------------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------------------------
create table evolucao.importacoes (
  id bigint generated always as identity primary key,
  evolucao_id uuid not null references evolucao.evolucoes (id),
  arquivo_nome text not null check (length(btrim(arquivo_nome)) between 1 and 200),
  -- {"nome", "idade", "genero", "terapias", "profissionais", "periodo_inicio", "periodo_fim",
  --  "filtro_profissional", "filtro_terapia", "total"}
  favorecido jsonb not null,
  -- [{"data": "2026-10-05", "texto": "…", "falta": false}], inclusive as de fora do período
  analises jsonb not null,
  criado_em timestamptz not null default now(),
  criado_por bigint references acesso.usuarios (id)
);

create index importacoes_evolucao_idx on evolucao.importacoes (evolucao_id, id desc);
create index importacoes_criado_por_idx on evolucao.importacoes (criado_por);

comment on table evolucao.importacoes is
  'Leitura do PDF do Tita de cada evolução (E02). A atual é a de maior id; o PDF não é guardado.';

-- E20: um dia de um assistido pertence a uma evolução só, e só a uma cujo período o contenha. A
-- FK composta traz o mês da evolução e o check confere a data contra ele.
alter table evolucao.evolucoes
  add constraint evolucoes_id_assistido_mes unique (id, assistido_id, mes_ref);

create table evolucao.dias_analisados (
  assistido_id bigint not null,
  data date not null,
  evolucao_id uuid not null,
  mes_ref date not null,
  n_evolucoes smallint not null check (n_evolucoes > 0), -- evoluções diárias no dia
  falta boolean not null, -- só houve falta naquele dia
  primary key (assistido_id, data),
  foreign key (evolucao_id, assistido_id, mes_ref)
    references evolucao.evolucoes (id, assistido_id, mes_ref),
  check (data >= (mes_ref - interval '1 month')::date and data < mes_ref)
);

create index dias_analisados_evolucao_idx on evolucao.dias_analisados (evolucao_id, assistido_id, mes_ref);

-- ---------------------------------------------------------------------------------------------
-- 2. Funções auxiliares
-- ---------------------------------------------------------------------------------------------
-- Sem acento, em minúsculas e com um espaço só: para comparar o nome do PDF com o do cadastro.
create function interno.normalizar_nome(p_nome text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    btrim(translate(lower(p_nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')),
    '\s+', ' ', 'g');
$$;

-- O formato da leitura (o banco não guarda o que a tela não sabe mostrar).
create function interno.leitura_do_tita_valida(p_favorecido jsonb, p_analises jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(p_favorecido) is distinct from 'object'
     or jsonb_typeof(p_favorecido -> 'nome') is distinct from 'string'
     or coalesce(p_favorecido ->> 'periodo_inicio', '') !~ '^\d{4}-\d{2}-\d{2}$'
     or coalesce(p_favorecido ->> 'periodo_fim', '') !~ '^\d{4}-\d{2}-\d{2}$'
     or length(p_favorecido::text) > 4000
     or jsonb_typeof(p_analises) is distinct from 'array'
     or jsonb_array_length(p_analises) not between 1 and 400 then
    return false;
  end if;
  for item in select value from jsonb_array_elements(p_analises) loop
    if jsonb_typeof(item) <> 'object'
       or coalesce(item ->> 'data', '') !~ '^\d{4}-\d{2}-\d{2}$'
       or jsonb_typeof(item -> 'texto') is distinct from 'string'
       or length(item ->> 'texto') > 20000
       or jsonb_typeof(item -> 'falta') is distinct from 'boolean' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------------------------
-- Antes de gravar: evolução em conferência, leitura no formato, e as recusas da E03.
create function interno.gravar_importacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
begin
  perform interno.exigir_em_conferencia(new.evolucao_id);
  if not interno.leitura_do_tita_valida(new.favorecido, new.analises) then
    raise exception 'A leitura do PDF não segue o formato esperado.'
      using errcode = '23514', hint = 'tita_leitura_invalida';
  end if;

  select a.nome, e.periodo_inicio, e.periodo_fim into ev
    from evolucao.evolucoes e
    join cadastro.assistidos a on a.id = e.assistido_id
   where e.id = new.evolucao_id;
  if interno.normalizar_nome(new.favorecido ->> 'nome') <> interno.normalizar_nome(ev.nome) then
    raise exception 'O PDF é de outro favorecido, não do assistido desta evolução.'
      using errcode = '23514', hint = 'tita_outro_assistido';
  end if;
  if (new.favorecido ->> 'periodo_inicio')::date > ev.periodo_inicio
     or (new.favorecido ->> 'periodo_fim')::date < ev.periodo_fim then
    raise exception 'O período avaliado do PDF não cobre o período analisado inteiro.'
      using errcode = '23514', hint = 'tita_periodo_incompleto';
  end if;
  if interno.normalizar_nome(coalesce(new.favorecido ->> 'filtro_terapia', '')) <> 'aba' then
    raise exception 'O PDF não é da terapia ABA.'
      using errcode = '23514', hint = 'tita_outra_terapia';
  end if;
  if interno.normalizar_nome(coalesce(new.favorecido ->> 'filtro_profissional', '')) <> 'todos' then
    raise exception 'O PDF foi exportado com filtro de profissional.'
      using errcode = '23514', hint = 'tita_filtro_de_profissional';
  end if;

  new.criado_em := now();
  new.criado_por := interno.usuario_atual_id();
  return new;
end;
$$;

create trigger gravar_importacao
  before insert on evolucao.importacoes
  for each row execute function interno.gravar_importacao();

-- Depois de gravar: os dias analisados passam a ser os desta importação (E20), só os de dentro
-- do período, e a evolução fica com a origem "tita".
create function interno.registrar_dias_analisados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
begin
  select e.assistido_id, e.mes_ref, e.periodo_inicio, e.periodo_fim into ev
    from evolucao.evolucoes e where e.id = new.evolucao_id;
  delete from evolucao.dias_analisados d where d.evolucao_id = new.evolucao_id;
  insert into evolucao.dias_analisados (assistido_id, data, evolucao_id, mes_ref, n_evolucoes, falta)
    select ev.assistido_id, (a ->> 'data')::date, new.evolucao_id, ev.mes_ref,
           count(*), bool_and((a ->> 'falta')::boolean)
      from jsonb_array_elements(new.analises) a
     where (a ->> 'data')::date between ev.periodo_inicio and ev.periodo_fim
     group by (a ->> 'data')::date;
  update evolucao.evolucoes e set origem = 'tita'
   where e.id = new.evolucao_id and e.origem <> 'tita';
  return null;
end;
$$;

create trigger registrar_dias_analisados
  after insert on evolucao.importacoes
  for each row execute function interno.registrar_dias_analisados();

revoke all on function
  interno.normalizar_nome(text), interno.leitura_do_tita_valida(jsonb, jsonb),
  interno.gravar_importacao(), interno.registrar_dias_analisados()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Grants e RLS
-- ---------------------------------------------------------------------------------------------
-- O cliente manda a evolução, o nome do arquivo e a leitura. Ninguém altera nem apaga pela API.
revoke all on evolucao.importacoes, evolucao.dias_analisados from public, anon, authenticated;
grant select, insert (evolucao_id, arquivo_nome, favorecido, analises)
  on evolucao.importacoes to authenticated;
grant select on evolucao.dias_analisados to authenticated;
grant all on evolucao.importacoes, evolucao.dias_analisados to service_role;

alter table evolucao.importacoes enable row level security;
alter table evolucao.importacoes force row level security;
alter table evolucao.dias_analisados enable row level security;
alter table evolucao.dias_analisados force row level security;

-- Seguem a evolução (o RLS de `evolucoes` vale na subconsulta), menos para contas médicas.
create policy segue_a_evolucao on evolucao.importacoes
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
create policy coordenador_importa on evolucao.importacoes
  for insert to authenticated
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));

create policy segue_a_evolucao on evolucao.dias_analisados
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
