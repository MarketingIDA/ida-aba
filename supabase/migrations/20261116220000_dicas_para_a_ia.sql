-- Dicas para a IA e orientações (E21, E22, P17). O coordenador deixa, num bloco que a IA escreveu,
-- a instrução do que ela deve fazer diferente: é a **dica**, que nasce pendente e não muda o texto
-- da evolução. A coordenação geral faz a curadoria: aprova, ajustando a redação, e a dica vira uma
-- **orientação**; ou descarta, com motivo opcional. A IA lê as orientações ativas antes de gerar o
-- rascunho. A orientação retirada deixa de ser lida.
--
-- Como no resto, tudo passa pela Data API com grants por coluna, RLS e triggers; nenhuma função
-- security definer fica exposta. Dar a dica é gravar a evolução, o campo e o texto; aprovar é
-- gravar a orientação com a dica de onde ela vem; descartar é mudar a situação da dica; retirar é
-- desmarcar `ativa`. Quem e quando vêm do banco. Nada se apaga.
-- Recusas novas (errcode 23514): `dica_sem_texto_da_ia`, `dica_ja_decidida`, `dica_sem_orientacao`.

-- ---------------------------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------------------------
-- Os blocos que a IA escreve: os 5 trechos da parte 2 e as duas listas de metas.
create type evolucao.campo_da_ia as enum (
  'abertura', 'programas', 'comportamentos', 'recursos', 'fechamento',
  'metas_alcancadas', 'metas_do_mes'
);
create type evolucao.situacao_da_dica as enum ('pendente', 'aprovada', 'descartada');

-- Sem trigger de auditoria: a linha é o registro da dica e da decisão. O texto original é o que a
-- IA escreveu naquele campo, que já vem sem o nome do assistido (E05); da dica, o nome sai na tela,
-- antes de gravar. Os nomes de quem sugeriu e de quem decidiu ficam gravados, como na devolução.
create table evolucao.dicas_ia (
  id bigint generated always as identity primary key,
  evolucao_id uuid not null references evolucao.evolucoes (id),
  campo evolucao.campo_da_ia not null,
  texto_original text not null,
  dica text not null check (length(btrim(dica)) between 10 and 1000),
  situacao evolucao.situacao_da_dica not null default 'pendente',
  criado_em timestamptz not null default now(),
  criado_por bigint not null references acesso.usuarios (id),
  criado_por_nome text not null,
  decidida_em timestamptz,
  decidida_por bigint references acesso.usuarios (id),
  decidida_por_nome text,
  motivo text check (motivo is null or length(btrim(motivo)) between 3 and 500), -- do descarte
  check ((situacao = 'pendente') = (decidida_em is null)),
  check ((situacao = 'pendente') = (decidida_por is null))
);

create index dicas_ia_situacao_idx on evolucao.dicas_ia (situacao, id desc);
create index dicas_ia_evolucao_idx on evolucao.dicas_ia (evolucao_id);
create index dicas_ia_criado_por_idx on evolucao.dicas_ia (criado_por);
create index dicas_ia_decidida_por_idx on evolucao.dicas_ia (decidida_por);

comment on table evolucao.dicas_ia is
  'Dicas do coordenador para a IA, por bloco do rascunho, à espera da curadoria (E21).';

-- A orientação vale para todas as unidades (P17) e não cita assistido: por isso tem auditoria.
create table evolucao.orientacoes_ia (
  id bigint generated always as identity primary key,
  dica_id bigint not null unique references evolucao.dicas_ia (id), -- de qual dica veio
  campo evolucao.campo_da_ia not null,
  texto text not null check (length(btrim(texto)) between 10 and 600),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(), -- quando foi aprovada
  criado_por bigint, -- quem aprovou
  atualizado_em timestamptz,
  atualizado_por bigint
);

create index orientacoes_ia_ativa_idx on evolucao.orientacoes_ia (id) where ativa;

comment on table evolucao.orientacoes_ia is
  'Orientações que a IA lê antes de gerar o rascunho: as dicas aprovadas na curadoria (E22).';

-- ---------------------------------------------------------------------------------------------
-- 2. Triggers
-- ---------------------------------------------------------------------------------------------
-- A dica: o texto original é do banco, a última versão da IA daquele campo. Sem versão da IA na
-- parte, não há o que corrigir.
create function interno.registrar_dica()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu bigint := interno.usuario_atual_id();
  parte smallint := case new.campo
                      when 'metas_alcancadas' then 3
                      when 'metas_do_mes' then 4
                      else 2
                    end;
  da_ia jsonb;
begin
  if eu is null then
    raise exception 'Sem acesso ativo ao sistema.' using errcode = '42501';
  end if;
  select v.conteudo into da_ia
    from evolucao.versoes v
   where v.evolucao_id = new.evolucao_id and v.numero = parte and v.autor = 'ia'
   order by v.id desc
   limit 1;
  if da_ia is null then
    raise exception 'Este bloco não tem texto escrito pela IA.'
      using errcode = '23514', hint = 'dica_sem_texto_da_ia';
  end if;
  new.texto_original := case
    when parte = 2 then coalesce(da_ia ->> new.campo::text, '')
    else coalesce(
      (select string_agg(m.meta, E'\n' order by m.ordem)
         from jsonb_array_elements_text(da_ia -> 'metas') with ordinality as m(meta, ordem)), '')
  end;
  new.dica := btrim(new.dica);
  new.situacao := 'pendente';
  new.criado_em := now();
  new.criado_por := eu;
  select u.nome into new.criado_por_nome from acesso.usuarios u where u.id = eu;
  new.decidida_em := null;
  new.decidida_por := null;
  new.decidida_por_nome := null;
  new.motivo := null;
  return new;
end;
$$;

create trigger registrar_dica
  before insert on evolucao.dicas_ia
  for each row execute function interno.registrar_dica();

-- A decisão: só a dica pendente se decide, e só fica aprovada a que tem orientação (quem grava a
-- orientação é quem a aprova). O motivo é do descarte.
create function interno.decidir_dica()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu bigint := interno.usuario_atual_id();
begin
  if new.situacao = old.situacao then
    new.motivo := old.motivo;
    return new;
  end if;
  if old.situacao <> 'pendente' or new.situacao = 'pendente' then
    raise exception 'A dica já foi decidida.'
      using errcode = '23514', hint = 'dica_ja_decidida';
  end if;
  if new.situacao = 'aprovada' then
    if not exists (select 1 from evolucao.orientacoes_ia o where o.dica_id = new.id) then
      raise exception 'A dica só fica aprovada com a orientação gravada.'
        using errcode = '23514', hint = 'dica_sem_orientacao';
    end if;
    new.motivo := null;
  else
    new.motivo := nullif(btrim(new.motivo), '');
  end if;
  new.decidida_em := now();
  new.decidida_por := eu;
  select u.nome into new.decidida_por_nome from acesso.usuarios u where u.id = eu;
  return new;
end;
$$;

create trigger decidir_dica
  before update on evolucao.dicas_ia
  for each row execute function interno.decidir_dica();

-- Aprovar: a orientação nasce de uma dica pendente, com o campo dela. A dica fica travada até o
-- fim: duas pessoas não decidem a mesma dica.
create function interno.aprovar_dica()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dica record;
begin
  if not interno.eh_coordenacao_geral() then
    raise exception 'Só a coordenação geral aprova uma dica.' using errcode = '42501';
  end if;
  select d.campo, d.situacao into dica
    from evolucao.dicas_ia d where d.id = new.dica_id for update;
  if dica.situacao is distinct from 'pendente' then
    raise exception 'A dica já foi decidida.'
      using errcode = '23514', hint = 'dica_ja_decidida';
  end if;
  new.campo := dica.campo;
  new.texto := btrim(new.texto);
  new.ativa := true;
  return new;
end;
$$;

-- O nome vem antes de `colunas_padrao` em ordem alfabética: a recusa sai antes de qualquer coluna.
create trigger aprovar_dica
  before insert on evolucao.orientacoes_ia
  for each row execute function interno.aprovar_dica();

create function interno.marcar_dica_aprovada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update evolucao.dicas_ia set situacao = 'aprovada' where id = new.dica_id;
  return null;
end;
$$;

create trigger marcar_dica_aprovada
  after insert on evolucao.orientacoes_ia
  for each row execute function interno.marcar_dica_aprovada();

create trigger colunas_padrao
  before insert or update on evolucao.orientacoes_ia
  for each row execute function interno.preencher_colunas_padrao();
create trigger auditoria
  after insert or update or delete on evolucao.orientacoes_ia
  for each row execute function interno.registrar_auditoria();

revoke all on function
  interno.registrar_dica(), interno.decidir_dica(), interno.aprovar_dica(),
  interno.marcar_dica_aprovada()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Grants e RLS
-- ---------------------------------------------------------------------------------------------
revoke all on evolucao.dicas_ia, evolucao.orientacoes_ia from public, anon, authenticated;
grant select, insert (evolucao_id, campo, dica), update (situacao, motivo)
  on evolucao.dicas_ia to authenticated;
grant select, insert (dica_id, texto), update (ativa)
  on evolucao.orientacoes_ia to authenticated;
grant all on evolucao.dicas_ia, evolucao.orientacoes_ia to service_role;

alter table evolucao.dicas_ia enable row level security;
alter table evolucao.dicas_ia force row level security;
alter table evolucao.orientacoes_ia enable row level security;
alter table evolucao.orientacoes_ia force row level security;

-- A dica: o coordenador dá nas evoluções da carteira dele e lê só as que ele deu; a coordenação
-- geral lê todas e decide. Contas médicas não lê.
create policy propria_ou_coordenacao_geral_le on evolucao.dicas_ia
  for select to authenticated
  using (
    (select interno.eh_coordenacao_geral())
    or criado_por = (select interno.usuario_atual_id())
  );
create policy coordenador_sugere on evolucao.dicas_ia
  for insert to authenticated
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));
create policy coordenacao_geral_decide on evolucao.dicas_ia
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()))
  with check ((select interno.eh_coordenacao_geral()));

-- A orientação: lê quem gera o rascunho ou acompanha a evolução; só a coordenação geral aprova e
-- retira.
create policy coordenacao_le on evolucao.orientacoes_ia
  for select to authenticated
  using ((select interno.usuario_ativo()) and not (select interno.eh_contas_medicas()));
create policy coordenacao_geral_aprova on evolucao.orientacoes_ia
  for insert to authenticated
  with check ((select interno.eh_coordenacao_geral()));
create policy coordenacao_geral_retira on evolucao.orientacoes_ia
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()))
  with check ((select interno.eh_coordenacao_geral()));

-- ---------------------------------------------------------------------------------------------
-- 4. A evolução inteira para a tela
-- ---------------------------------------------------------------------------------------------
-- A evolução passa a dizer o gênero do assistido (a tela tira o nome da dica antes de gravar, E05)
-- e quais partes têm texto da IA (só nelas cabe a dica).
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
    'assistido', a.nome, 'genero', a.genero, 'plano', p.nome, 'unidade', u.nome, 'turno', c.turno,
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
    'partes_da_ia', coalesce((
      select jsonb_agg(distinct vi.numero)
        from evolucao.versoes vi
       where vi.evolucao_id = e.id and vi.autor = 'ia'), '[]'::jsonb),
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
