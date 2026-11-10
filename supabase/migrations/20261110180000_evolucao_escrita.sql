-- Evolução escrita à mão: o coordenador cria a evolução do mês de um assistido da carteira,
-- escreve as partes 2 a 4, confere as 4 e conclui. A importação do Tita e a IA entram depois,
-- sobre estas mesmas tabelas.
--
-- Tudo passa pela Data API com grants por coluna, RLS e triggers, como no cadastro: nenhuma
-- função security definer fica exposta. Regras desta etapa:
--   E01 uma evolução por assistido e mês (o `unique` já existe), só da carteira de quem cria, só
--       de assistido ativo e só no mês aberto (o mês corrente em Recife), que o banco define;
--   E07 cada gravação de uma parte é uma versão nova; nenhuma se altera nem se apaga;
--   E08 gravar uma parte conferida a devolve para "a conferir";
--   E13 em conferência ↔ concluída, só pelo coordenador da carteira (enviada fica para a etapa
--       do arquivo do mês);
--   para concluir: as 4 partes conferidas, assistido com plano (E09), texto da evolução com 7
--   linhas ou mais (E10, 1 linha = 95 caracteres) e 4 metas ou mais para o mês atual (E12).
-- Cada recusa tem errcode 23514 e um `hint` fixo, que a tela traduz.

alter table evolucao.evolucoes alter column origem set default 'manual';

-- ---------------------------------------------------------------------------------------------
-- 1. Versões das partes (E07)
-- ---------------------------------------------------------------------------------------------
create type evolucao.autor as enum ('coordenador', 'ia');

-- A parte 1 (identificação) vem do cadastro e não tem versão. Conteúdo:
--   parte 2: {"abertura", "programas", "comportamentos", "recursos", "fechamento"}, os 5 trechos;
--   partes 3 e 4: {"metas": ["…", …]}, uma meta por item.
-- Sem trigger de auditoria: a própria tabela é o histórico, e o texto de saúde não se duplica.
create table evolucao.versoes (
  id bigint generated always as identity primary key,
  evolucao_id uuid not null,
  numero smallint not null check (numero between 2 and 4),
  conteudo jsonb not null,
  autor evolucao.autor not null default 'coordenador',
  instrucao text, -- a instrução do "gerar de novo" da IA (etapa da IA)
  criado_em timestamptz not null default now(),
  criado_por bigint references acesso.usuarios (id),
  foreign key (evolucao_id, numero) references evolucao.partes (evolucao_id, numero)
);

-- A versão atual de cada parte é a de maior `id`.
create index versoes_parte_idx on evolucao.versoes (evolucao_id, numero, id desc);
create index versoes_criado_por_idx on evolucao.versoes (criado_por);

-- ---------------------------------------------------------------------------------------------
-- 2. Funções auxiliares
-- ---------------------------------------------------------------------------------------------
-- O mês aberto: o mês corrente em Recife (E18). A evolução de novembro é feita em novembro.
create function interno.mes_aberto()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'America/Recife')::date;
$$;

-- Evoluções dos assistidos da carteira do usuário atual (para as policies de escrita).
create function interno.evolucoes_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from evolucao.evolucoes e
   where e.assistido_id in (select interno.assistidos_do_usuario());
$$;

-- O formato do conteúdo de cada parte (o banco não guarda o que a tela não sabe mostrar).
create function interno.conteudo_da_parte_valido(p_numero smallint, p_conteudo jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(p_conteudo) <> 'object' then
    return false;
  end if;
  if p_numero = 2 then
    if (select array_agg(k order by k) from jsonb_object_keys(p_conteudo) k) is distinct from
       array['abertura', 'comportamentos', 'fechamento', 'programas', 'recursos'] then
      return false;
    end if;
    for item in select value from jsonb_each(p_conteudo) loop
      if jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 5000 then
        return false;
      end if;
    end loop;
    return true;
  end if;
  if (select array_agg(k) from jsonb_object_keys(p_conteudo) k) is distinct from array['metas']
     or jsonb_typeof(p_conteudo -> 'metas') is distinct from 'array'
     or jsonb_array_length(p_conteudo -> 'metas') > 30 then
    return false;
  end if;
  for item in select value from jsonb_array_elements(p_conteudo -> 'metas') loop
    if jsonb_typeof(item) <> 'string' or btrim(item #>> '{}') = ''
       or length(item #>> '{}') > 500 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- Linhas do texto da evolução (E10): os trechos preenchidos, na ordem do manual, unidos por um
-- espaço; 1 linha = 95 caracteres (Cambria 12 em A4). A tela conta do mesmo jeito.
create function interno.linhas_do_texto(p_conteudo jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(ceil(length(string_agg(t.texto, ' ' order by t.ordem)) / 95.0)::integer, 0)
    from (
      select btrim(p_conteudo ->> k) as texto, o as ordem
        from unnest(array['abertura', 'programas', 'comportamentos', 'recursos', 'fechamento'])
             with ordinality as c(k, o)
    ) t
   where t.texto <> '';
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------------------------
-- Nova evolução: o mês é o aberto (quem chama pela API não escolhe) e o assistido está ativo.
-- O nome vem antes de `codigo_da_evolucao` em ordem alfabética: o código já sai com o mês certo.
create function interno.abrir_evolucao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if interno.usuario_atual_id() is not null then
    new.mes_ref := interno.mes_aberto();
  end if;
  if not exists (
    select 1 from cadastro.assistidos a where a.id = new.assistido_id and a.ativo
  ) then
    raise exception 'O assistido está desativado.'
      using errcode = '23514', hint = 'assistido_desativado';
  end if;
  return new;
end;
$$;

create trigger abrir_evolucao
  before insert on evolucao.evolucoes
  for each row execute function interno.abrir_evolucao();

-- As 4 partes nascem com a evolução, a conferir.
create function interno.criar_partes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into evolucao.partes (evolucao_id, numero)
    select new.id, n from generate_series(1, 4) n;
  return null;
end;
$$;

create trigger criar_partes
  after insert on evolucao.evolucoes
  for each row execute function interno.criar_partes();

-- Só a evolução em conferência muda (E13).
create function interno.exigir_em_conferencia(p_evolucao uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from evolucao.evolucoes e where e.id = p_evolucao and e.situacao = 'em_conferencia'
  ) then
    raise exception 'A evolução não está em conferência; reabra antes de mudar.'
      using errcode = '23514', hint = 'evolucao_fechada';
  end if;
end;
$$;

-- Conferir uma parte: quem e quando vêm do banco (E08).
create function interno.conferir_parte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.exigir_em_conferencia(new.evolucao_id);
  if new.conferida and not old.conferida then
    new.conferida_em := now();
    new.conferida_por := interno.usuario_atual_id();
  elsif not new.conferida then
    new.conferida_em := null;
    new.conferida_por := null;
  else
    new.conferida_em := old.conferida_em;
    new.conferida_por := old.conferida_por;
  end if;
  return new;
end;
$$;

create trigger conferir_parte
  before update on evolucao.partes
  for each row execute function interno.conferir_parte();

-- Versão nova: evolução em conferência e conteúdo no formato da parte; autor e data do banco.
create function interno.gravar_versao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform interno.exigir_em_conferencia(new.evolucao_id);
  if not interno.conteudo_da_parte_valido(new.numero, new.conteudo) then
    raise exception 'O conteúdo não segue o formato da parte %.', new.numero
      using errcode = '23514', hint = 'conteudo_invalido';
  end if;
  new.criado_em := now();
  new.criado_por := interno.usuario_atual_id();
  return new;
end;
$$;

create trigger gravar_versao
  before insert on evolucao.versoes
  for each row execute function interno.gravar_versao();

-- Gravar uma parte conferida a devolve para "a conferir" (E08).
create function interno.reabrir_parte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update evolucao.partes p set conferida = false
   where p.evolucao_id = new.evolucao_id and p.numero = new.numero and p.conferida;
  return null;
end;
$$;

create trigger reabrir_parte
  after insert on evolucao.versoes
  for each row execute function interno.reabrir_parte();

-- Concluir e reabrir (E13), com o que a conclusão exige.
create function interno.conferir_conclusao(p_evolucao uuid, p_assistido bigint)
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

create function interno.mudar_situacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = old.situacao then
    return new;
  end if;
  if old.situacao = 'em_conferencia' and new.situacao = 'concluida' then
    perform interno.conferir_conclusao(new.id, new.assistido_id);
    new.concluida_em := now();
  elsif old.situacao = 'concluida' and new.situacao = 'em_conferencia' then
    new.concluida_em := null;
  else
    raise exception 'A evolução não pode ir de % para %.', old.situacao, new.situacao
      using errcode = '23514', hint = 'situacao_invalida';
  end if;
  return new;
end;
$$;

create trigger mudar_situacao
  before update of situacao on evolucao.evolucoes
  for each row execute function interno.mudar_situacao();

revoke all on function
  interno.mes_aberto(), interno.evolucoes_do_usuario(),
  interno.conteudo_da_parte_valido(smallint, jsonb), interno.linhas_do_texto(jsonb),
  interno.abrir_evolucao(), interno.criar_partes(), interno.exigir_em_conferencia(uuid),
  interno.conferir_parte(), interno.gravar_versao(), interno.reabrir_parte(),
  interno.conferir_conclusao(uuid, bigint), interno.mudar_situacao()
  from public, anon, authenticated;
grant execute on function interno.evolucoes_do_usuario() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 4. Grants e RLS
-- ---------------------------------------------------------------------------------------------
-- O coordenador cria (só o assistido: o mês e a origem são do banco), muda a situação, confere as
-- partes e grava versões. Ninguém apaga nada pela API.
grant insert (assistido_id), update (situacao) on evolucao.evolucoes to authenticated;
grant update (conferida) on evolucao.partes to authenticated;
grant select, insert (evolucao_id, numero, conteudo) on evolucao.versoes to authenticated;
grant all on evolucao.versoes to service_role;

alter table evolucao.versoes enable row level security;
alter table evolucao.versoes force row level security;

create policy coordenador_cria on evolucao.evolucoes
  for insert to authenticated
  with check (assistido_id in (select interno.assistidos_do_usuario()));
create policy coordenador_altera on evolucao.evolucoes
  for update to authenticated
  using (assistido_id in (select interno.assistidos_do_usuario()))
  with check (assistido_id in (select interno.assistidos_do_usuario()));

create policy coordenador_confere on evolucao.partes
  for update to authenticated
  using (evolucao_id in (select interno.evolucoes_do_usuario()))
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));

-- Lê quem lê a evolução (o RLS de `evolucoes` vale dentro da subconsulta).
create policy segue_a_evolucao on evolucao.versoes
  for select to authenticated
  using (evolucao_id in (select e.id from evolucao.evolucoes e));
create policy coordenador_escreve on evolucao.versoes
  for insert to authenticated
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));

-- ---------------------------------------------------------------------------------------------
-- 5. A evolução inteira para a tela
-- ---------------------------------------------------------------------------------------------
-- A identificação (parte 1) vem do cadastro atual; das partes 2 a 4, só a versão atual. security
-- invoker: o RLS vale para quem chama, e quem não lê a evolução recebe `null`. `editavel` repete
-- a regra das policies de escrita: só o coordenador da carteira escreve.
create function evolucao.evolucao_completa(p_id uuid)
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
    'assistido', a.nome, 'plano', p.nome, 'unidade', u.nome, 'turno', c.turno,
    'coordenador', co.nome,
    'editavel', e.assistido_id in (select interno.assistidos_do_usuario()),
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
        ) v), '[]'::jsonb)
  )
    from evolucao.evolucoes e
    join cadastro.assistidos a on a.id = e.assistido_id
    join cadastro.unidades u on u.id = a.unidade_id
    join cadastro.carteiras c on c.id = a.carteira_id
    left join cadastro.planos p on p.id = a.plano_id
    left join acesso.usuarios co on co.id = c.coordenador_id
   where e.id = p_id;
$$;

revoke all on function evolucao.evolucao_completa(uuid) from public, anon;
grant execute on function evolucao.evolucao_completa(uuid) to authenticated, service_role;
