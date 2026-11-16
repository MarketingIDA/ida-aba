-- Sincronização do cadastro de assistidos com a Tita (E28). A Edge Function `sincronizar-tita` busca
-- a lista de favorecidos na API da Tita e a entrega a `cadastro.sincronizar_tita`, que casa cada um
-- com o cadastro, cria quem falta e guarda o que precisa de ação. Do favorecido entram só o id, o
-- nome, o sexo, o nascimento, se está ativo e as unidades: CPF e responsáveis não vêm para cá.
--
-- Regras:
-- * O id da Tita é a chave. A mesma criança recadastrada na Tita tem dois ids: os dois apontam para
--   o mesmo assistido (`cadastro.assistidos_da_tita`).
-- * Sem id ligado, casa pelo nome completo e pelo nascimento iguais, sem ligar para acento nem
--   maiúscula. Quem bate só nos dois primeiros nomes e no nascimento entra mesmo assim, com a
--   pendência "possível duplicado": juntar duas crianças por engano misturaria prontuários.
-- * O assistido novo entra como rascunho: sem carteira, porque a Tita não diz o turno. Sexo
--   "Outros" entra também sem gênero. O rascunho não aparece para coordenador nenhum e não abre
--   evolução; sai do rascunho quando a coordenação geral escolhe a carteira (e o gênero).
-- * A sincronização atualiza nome, gênero e nascimento. Nunca mexe em carteira, plano nem ativo. A
--   unidade só muda no rascunho; no assistido com carteira, a diferença vira pendência.
-- * Nada se descarta calado: o que não entra vira pendência para a coordenação geral. As pendências
--   são o retrato da última sincronização: cada rodada apaga as anteriores e grava as de agora.
-- * A unidade chega pelo nome que a Tita usa, num de-para que a coordenação geral mantém. A
--   Imbiribeira (matriz) fica ligada a nenhuma unidade: os favorecidos de lá são ignorados.

-- ---------------------------------------------------------------------------------------------
-- 1. Assistido em rascunho: sem carteira e, quando a Tita não disse, sem gênero
-- ---------------------------------------------------------------------------------------------
alter table cadastro.assistidos
  alter column carteira_id drop not null,
  alter column genero drop not null,
  add constraint assistido_na_carteira_tem_genero check (carteira_id is null or genero is not null);

comment on column cadastro.assistidos.carteira_id is
  'Nulo: rascunho vindo da Tita, à espera da carteira (a Tita não diz o turno).';

-- O assistido ativo só entra em carteira ativa; o rascunho não tem carteira para conferir.
drop trigger conferir_carteira_do_assistido on cadastro.assistidos;
create trigger conferir_carteira_do_assistido
  before insert or update of carteira_id, ativo on cadastro.assistidos
  for each row
  when (new.ativo and new.carteira_id is not null)
  execute function interno.conferir_carteira_do_assistido();

-- Quem já tem carteira não volta a rascunho: as evoluções dele dependem da carteira.
create function interno.guardar_rascunho()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.carteira_id is not null and new.carteira_id is null then
    raise exception 'O assistido com carteira não volta a ser rascunho.'
      using errcode = '23514', hint = 'carteira_obrigatoria';
  end if;
  return new;
end;
$$;

create trigger guardar_rascunho
  before update of carteira_id on cadastro.assistidos
  for each row execute function interno.guardar_rascunho();

-- ---------------------------------------------------------------------------------------------
-- 2. Ligação com a Tita, de-para das unidades, pendências e histórico
-- ---------------------------------------------------------------------------------------------
create table cadastro.assistidos_da_tita (
  tita_id bigint primary key check (tita_id > 0),
  assistido_id bigint not null references cadastro.assistidos (id),
  criado_em timestamptz not null default now()
);

create index assistidos_da_tita_assistido_idx on cadastro.assistidos_da_tita (assistido_id);

comment on table cadastro.assistidos_da_tita is
  'Ids de favorecido da Tita de cada assistido. Recadastro na Tita: dois ids, um assistido.';

create table cadastro.unidades_da_tita (
  id bigint generated always as identity primary key,
  nome_na_tita text not null unique check (length(btrim(nome_na_tita)) between 2 and 120),
  -- Nulo: a Tita usa a unidade, mas ela não entra aqui (a matriz).
  unidade_id bigint references cadastro.unidades (id),
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint
);

comment on table cadastro.unidades_da_tita is
  'De-para do nome da unidade na Tita para a unidade do cadastro. Sem unidade: ignorada.';

create table cadastro.pendencias_da_tita (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in (
    'unidade_desconhecida', 'sem_unidade', 'varias_unidades', 'outra_unidade', 'nome_incompleto',
    'data_invalida', 'sem_genero', 'possivel_duplicado', 'inativo_na_tita', 'fora_da_tita',
    'sem_id', 'erro')),
  tita_id bigint,
  assistido_id bigint references cadastro.assistidos (id),
  nome text, -- como veio da Tita ou como está no cadastro, para a coordenação geral achar a criança
  detalhe text,
  quantidade integer
);

comment on table cadastro.pendencias_da_tita is
  'O que precisa de ação depois da última sincronização com a Tita. Cada rodada refaz a lista.';

create table cadastro.sincronizacoes_da_tita (
  id bigint generated always as identity primary key,
  feita_em timestamptz not null default now(),
  origem text not null check (origem in ('manual', 'agendada')),
  pedida_por bigint references acesso.usuarios (id),
  resumo jsonb, -- só números
  erro text, -- a falha, sem dado de criança
  check ((resumo is null) <> (erro is null))
);

create index sincronizacoes_da_tita_feita_em_idx on cadastro.sincronizacoes_da_tita (feita_em desc);

comment on table cadastro.sincronizacoes_da_tita is
  'Cada sincronização com a Tita: quem pediu, os números ou a falha. Sem nome de criança.';

create trigger colunas_padrao
  before insert or update on cadastro.unidades_da_tita
  for each row execute function interno.preencher_colunas_padrao();
create trigger auditoria
  after insert or update or delete on cadastro.unidades_da_tita
  for each row execute function interno.registrar_auditoria();

-- O de-para que valia em 16/11/2026, pela sigla (o banco de prévia não tem as unidades: lá entra
-- só a matriz). A Tita renomeia sem aviso: o nome novo vira pendência até a coordenação geral ligar.
insert into cadastro.unidades_da_tita (nome_na_tita, unidade_id)
select v.nome_na_tita, u.id
  from (values
    ('INSTITUTO DO AUTISMO - AGAMENON', 'AGA'),
    ('INSTITUTO DO AUTISMO - BOA VIAGEM', 'BOV'),
    ('INSTITUTO DO AUTISMO - CARPINA', 'CPN'),
    ('INSTITUTO DO AUTISMO - CARUARU', 'CAR'),
    ('INSTITUTO DO AUTISMO - GRAÇAS', 'GRA'),
    ('INSTITUTO DO AUTISMO - IGARASSU', 'IGA'),
    ('INSTITUTO DO AUTISMO - IPOJUCA', 'IPO'),
    ('INSTITUTO DO AUTISMO - OLINDA', 'OLI'),
    ('INSTITUTO DO AUTISMO - POÇO', 'POC'),
    ('INSTITUTO DO AUTISMO - TIMBAÚBA', 'TIM'),
    ('INSTITUTO DO AUTISMO - IMBIRIBEIRA', null)
  ) as v (nome_na_tita, sigla)
  left join cadastro.unidades u on u.sigla = v.sigla
 where v.sigla is null or u.id is not null;

-- ---------------------------------------------------------------------------------------------
-- 3. Grants e RLS: a coordenação geral lê tudo e mantém o de-para; só o servidor sincroniza
-- ---------------------------------------------------------------------------------------------
revoke all on cadastro.assistidos_da_tita, cadastro.unidades_da_tita, cadastro.pendencias_da_tita,
  cadastro.sincronizacoes_da_tita from public, anon, authenticated;
grant select on cadastro.unidades_da_tita, cadastro.pendencias_da_tita,
  cadastro.sincronizacoes_da_tita to authenticated;
grant insert (nome_na_tita, unidade_id), update (unidade_id) on cadastro.unidades_da_tita
  to authenticated;
grant all on cadastro.assistidos_da_tita, cadastro.unidades_da_tita, cadastro.pendencias_da_tita,
  cadastro.sincronizacoes_da_tita to service_role;

alter table cadastro.assistidos_da_tita enable row level security;
alter table cadastro.assistidos_da_tita force row level security;
alter table cadastro.unidades_da_tita enable row level security;
alter table cadastro.unidades_da_tita force row level security;
alter table cadastro.pendencias_da_tita enable row level security;
alter table cadastro.pendencias_da_tita force row level security;
alter table cadastro.sincronizacoes_da_tita enable row level security;
alter table cadastro.sincronizacoes_da_tita force row level security;

create policy coordenacao_geral_le on cadastro.unidades_da_tita
  for select to authenticated using ((select interno.eh_coordenacao_geral()));
create policy coordenacao_geral_insere on cadastro.unidades_da_tita
  for insert to authenticated with check ((select interno.eh_coordenacao_geral()));
create policy coordenacao_geral_altera on cadastro.unidades_da_tita
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()))
  with check ((select interno.eh_coordenacao_geral()));
create policy coordenacao_geral_le on cadastro.pendencias_da_tita
  for select to authenticated using ((select interno.eh_coordenacao_geral()));
create policy coordenacao_geral_le on cadastro.sincronizacoes_da_tita
  for select to authenticated using ((select interno.eh_coordenacao_geral()));

-- ---------------------------------------------------------------------------------------------
-- 4. A sincronização
-- ---------------------------------------------------------------------------------------------

-- O nome para comparar: sem acento, minúsculo, só letras e um espaço entre as palavras.
create function interno.chave_do_nome(p_nome text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(regexp_replace(lower(translate(p_nome,
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')), '[^a-z]+', ' ', 'g')), '');
$$;

-- Uma pendência em JSON, sem as chaves vazias.
create function interno.pendencia_da_tita(
  p_tipo text,
  p_tita_id bigint,
  p_assistido_id bigint,
  p_nome text,
  p_detalhe text default null
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'tipo', p_tipo, 'tita_id', p_tita_id, 'assistido_id', p_assistido_id, 'nome', p_nome,
    'detalhe', p_detalhe)));
$$;

-- Os favorecidos já normalizados pela Edge Function: `tita_id`, `nome`, `genero` ('feminino',
-- 'masculino' ou nulo), `data_nascimento` (AAAA-MM-DD ou nulo), `data_invalida`, `ativo` e
-- `unidades` (os nomes na Tita). `p_sem_id`: quantos vieram sem id e ficaram de fora.
-- Com `p_simular`, faz tudo, devolve os números e desfaz: nada fica gravado.
create function cadastro.sincronizar_tita(
  p_favorecidos jsonb,
  p_origem text,
  p_pedida_por bigint default null,
  p_simular boolean default false,
  p_sem_id integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  f record;
  v_hoje date := (now() at time zone 'America/Recife')::date;
  v_atual cadastro.assistidos%rowtype;
  v_assistido bigint;
  v_mapeadas bigint[];
  v_desconhecidas integer;
  v_ignoradas integer;
  v_nome_ok boolean;
  v_data_ok boolean;
  v_data date;
  v_chave text;
  v_linha jsonb;
  v_pendencias jsonb := '[]';
  v_recebidos integer := 0;
  v_criados integer := 0;
  v_ligados integer := 0;
  v_atualizados integer := 0;
  v_ignorados integer := 0;
  v_criou boolean;
  v_ligou boolean;
  v_mudou boolean;
  v_ignorou boolean;
  v_resumo jsonb;
begin
  if p_origem is null or p_origem not in ('manual', 'agendada') then
    raise exception 'Origem da sincronização inválida.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_favorecidos) is distinct from 'array' or jsonb_array_length(p_favorecidos) = 0
  then
    raise exception 'A Tita devolveu a lista vazia.' using errcode = '22023', hint = 'lista_vazia';
  end if;

  -- Uma sincronização por vez: a segunda espera a primeira terminar.
  perform pg_advisory_xact_lock(hashtextextended('cadastro.sincronizar_tita', 0));

  begin -- na simulação, tudo o que está neste bloco é desfeito no fim
    drop table if exists pg_temp.favorecidos_da_tita;
    create temp table favorecidos_da_tita on commit drop as
    select distinct on (x.tita_id)
           x.tita_id, btrim(x.nome) as nome, x.genero, x.data_nascimento,
           coalesce(x.data_invalida, false) as data_invalida, coalesce(x.ativo, true) as ativo,
           case when jsonb_typeof(x.unidades) = 'array' then x.unidades else '[]'::jsonb end
             as unidades
      from jsonb_to_recordset(p_favorecidos) as x (
             tita_id bigint, nome text, genero text, data_nascimento date, data_invalida boolean,
             ativo boolean, unidades jsonb)
     where x.tita_id is not null
     order by x.tita_id;

    -- As chaves dos nomes do cadastro, calculadas uma vez para casar sem varrer a tabela.
    drop table if exists pg_temp.chaves_dos_assistidos;
    create temp table chaves_dos_assistidos on commit drop as
    select a.id, k.chave, split_part(k.chave, ' ', 1) || ' ' || split_part(k.chave, ' ', 2) as curta,
           a.data_nascimento
      from cadastro.assistidos a
      cross join lateral (select interno.chave_do_nome(a.nome) as chave) k;
    create index on pg_temp.chaves_dos_assistidos (chave, data_nascimento);

    for f in select * from pg_temp.favorecidos_da_tita order by tita_id loop
      v_recebidos := v_recebidos + 1;
      begin -- um favorecido com erro vira pendência e não derruba os outros
        v_linha := '[]';
        v_criou := false;
        v_ligou := false;
        v_mudou := false;
        v_ignorou := false;
        v_nome_ok := coalesce(length(f.nome) between 5 and 120 and f.nome ~ '\S\s+\S', false);
        v_data_ok := not f.data_invalida and f.data_nascimento is not null
                     and f.data_nascimento between date '1990-01-01' and v_hoje;
        v_data := case when v_data_ok then f.data_nascimento end;
        v_chave := interno.chave_do_nome(f.nome);

        select coalesce(array_agg(distinct d.unidade_id) filter (where d.unidade_id is not null),
                        '{}'),
               count(*) filter (where d.id is null),
               count(*) filter (where d.id is not null and d.unidade_id is null)
          into v_mapeadas, v_desconhecidas, v_ignoradas
          from jsonb_array_elements_text(f.unidades) as t (nome)
          left join cadastro.unidades_da_tita d on d.nome_na_tita = btrim(t.nome);

        -- Quem é: pelo id da Tita; sem ele, pelo nome completo e pelo nascimento iguais.
        select t.assistido_id into v_assistido
          from cadastro.assistidos_da_tita t where t.tita_id = f.tita_id;
        if v_assistido is null and v_data is not null and v_chave is not null then
          select c.id into v_assistido
            from pg_temp.chaves_dos_assistidos c
           where c.chave = v_chave and c.data_nascimento = v_data
           order by c.id
           limit 1;
          if v_assistido is not null then
            insert into cadastro.assistidos_da_tita (tita_id, assistido_id)
            values (f.tita_id, v_assistido);
            v_ligou := true;
          end if;
        end if;

        if v_assistido is not null then
          -- Já está no cadastro: atualiza o que a Tita manda e aponta o resto.
          select * into v_atual from cadastro.assistidos a where a.id = v_assistido for update;
          if cardinality(v_mapeadas) > 0 and not (v_atual.unidade_id = any (v_mapeadas)) then
            if cardinality(v_mapeadas) > 1 then
              v_linha := v_linha || interno.pendencia_da_tita('varias_unidades', f.tita_id,
                v_assistido, v_atual.nome, (select string_agg(t.nome, ', ')
                                              from jsonb_array_elements_text(f.unidades) t (nome)));
            elsif v_atual.carteira_id is not null then
              v_linha := v_linha || interno.pendencia_da_tita('outra_unidade', f.tita_id,
                v_assistido, v_atual.nome,
                (select u.nome from cadastro.unidades u where u.id = v_mapeadas[1]));
            end if;
          end if;
          if not v_nome_ok then
            v_linha := v_linha || interno.pendencia_da_tita('nome_incompleto', f.tita_id,
              v_assistido, coalesce(f.nome, v_atual.nome));
          end if;
          if not v_data_ok then
            v_linha := v_linha || interno.pendencia_da_tita('data_invalida', f.tita_id,
              v_assistido, v_atual.nome);
          end if;
          if not f.ativo and v_atual.ativo then
            v_linha := v_linha || interno.pendencia_da_tita('inativo_na_tita', f.tita_id,
              v_assistido, v_atual.nome);
          end if;

          -- O nome só muda se mudar de fato (não só de maiúscula ou de acento).
          update cadastro.assistidos a
             set nome = n.nome, genero = n.genero, data_nascimento = n.data_nascimento,
                 unidade_id = n.unidade_id
            from (select
                    case when v_nome_ok and v_chave is distinct from interno.chave_do_nome(v_atual.nome)
                         then f.nome else v_atual.nome end as nome,
                    coalesce(f.genero::cadastro.genero, v_atual.genero) as genero,
                    coalesce(v_data, v_atual.data_nascimento) as data_nascimento,
                    case when v_atual.carteira_id is null and cardinality(v_mapeadas) = 1
                         then v_mapeadas[1] else v_atual.unidade_id end as unidade_id) n
           where a.id = v_assistido
             and (a.nome, a.genero, a.data_nascimento, a.unidade_id)
                 is distinct from (n.nome, n.genero, n.data_nascimento, n.unidade_id);
          v_mudou := found;
        elsif not f.ativo or (cardinality(v_mapeadas) = 0 and v_desconhecidas = 0
                              and v_ignoradas > 0) then
          -- Inativo na Tita e nunca cadastrado aqui, ou só da matriz.
          v_ignorou := true;
        elsif v_desconhecidas > 0 then
          null; -- entra na pendência da unidade desconhecida, no fim
        elsif cardinality(v_mapeadas) = 0 then
          v_linha := v_linha || interno.pendencia_da_tita('sem_unidade', f.tita_id, null, f.nome);
        elsif cardinality(v_mapeadas) > 1 then
          v_linha := v_linha || interno.pendencia_da_tita('varias_unidades', f.tita_id, null,
            f.nome, (select string_agg(t.nome, ', ') from jsonb_array_elements_text(f.unidades) t (nome)));
        elsif not v_nome_ok then
          v_linha := v_linha || interno.pendencia_da_tita('nome_incompleto', f.tita_id, null, f.nome);
        else
          -- Novo: entra como rascunho, sem carteira.
          insert into cadastro.assistidos (nome, genero, data_nascimento, unidade_id, carteira_id)
          values (f.nome, f.genero::cadastro.genero, v_data, v_mapeadas[1], null)
          returning id into v_assistido;
          insert into cadastro.assistidos_da_tita (tita_id, assistido_id)
          values (f.tita_id, v_assistido);
          insert into pg_temp.chaves_dos_assistidos (id, chave, curta, data_nascimento)
          values (v_assistido, v_chave,
                  split_part(v_chave, ' ', 1) || ' ' || split_part(v_chave, ' ', 2), v_data);
          v_criou := true;
          if not v_data_ok then
            v_linha := v_linha || interno.pendencia_da_tita('data_invalida', f.tita_id,
              v_assistido, f.nome);
          end if;
        end if;

        -- Por último: se algo acima falhou, nada desta linha conta.
        v_pendencias := v_pendencias || v_linha;
        v_criados := v_criados + v_criou::integer;
        v_ligados := v_ligados + v_ligou::integer;
        v_atualizados := v_atualizados + v_mudou::integer;
        v_ignorados := v_ignorados + v_ignorou::integer;
      exception when others then
        v_pendencias := v_pendencias
          || interno.pendencia_da_tita('erro', f.tita_id, null, f.nome, sqlerrm);
      end;
    end loop;

    -- Nomes de unidade que o de-para não conhece: uma pendência por nome, com quantos vieram.
    v_pendencias := v_pendencias || coalesce((
      select jsonb_agg(jsonb_build_object('tipo', 'unidade_desconhecida', 'detalhe', s.nome,
                                          'quantidade', s.quantidade) order by s.nome)
        from (select btrim(t.nome) as nome, count(*)::integer as quantidade
                from pg_temp.favorecidos_da_tita f
               cross join jsonb_array_elements_text(f.unidades) as t (nome)
               where not exists (select 1 from cadastro.unidades_da_tita d
                                  where d.nome_na_tita = btrim(t.nome))
               group by btrim(t.nome)) s), '[]');

    if p_sem_id > 0 then
      v_pendencias := v_pendencias
        || jsonb_build_array(jsonb_build_object('tipo', 'sem_id', 'quantidade', p_sem_id));
    end if;

    -- Ligado à Tita, ativo aqui e fora da lista de agora.
    v_pendencias := v_pendencias || coalesce((
      select jsonb_agg(interno.pendencia_da_tita('fora_da_tita', null, a.id, a.nome) -> 0
                       order by a.nome)
        from cadastro.assistidos a
       where a.ativo
         and exists (select 1 from cadastro.assistidos_da_tita t where t.assistido_id = a.id)
         and not exists (select 1 from cadastro.assistidos_da_tita t
                           join pg_temp.favorecidos_da_tita f on f.tita_id = t.tita_id
                          where t.assistido_id = a.id)), '[]');

    -- Rascunho sem gênero: o sexo veio "Outros" (ou vazio) da Tita.
    v_pendencias := v_pendencias || coalesce((
      select jsonb_agg(interno.pendencia_da_tita('sem_genero', null, a.id, a.nome) -> 0
                       order by a.nome)
        from cadastro.assistidos a
       where a.ativo and a.genero is null), '[]');

    -- Rascunho parecido com outro assistido: dois primeiros nomes e nascimento iguais.
    truncate pg_temp.chaves_dos_assistidos;
    insert into pg_temp.chaves_dos_assistidos (id, chave, curta, data_nascimento)
    select a.id, k.chave, split_part(k.chave, ' ', 1) || ' ' || split_part(k.chave, ' ', 2),
           a.data_nascimento
      from cadastro.assistidos a
      cross join lateral (select interno.chave_do_nome(a.nome) as chave) k
     where a.ativo and a.data_nascimento is not null;
    v_pendencias := v_pendencias || coalesce((
      select jsonb_agg(interno.pendencia_da_tita('possivel_duplicado', null, a.id, a.nome,
                         'Parecido com ' || b.nome) -> 0 order by a.nome, b.nome)
        from cadastro.assistidos a
        join pg_temp.chaves_dos_assistidos c on c.id = a.id
        join pg_temp.chaves_dos_assistidos o
          on o.curta = c.curta and o.data_nascimento = c.data_nascimento and o.id <> c.id
        join cadastro.assistidos b on b.id = o.id
       where a.carteira_id is null), '[]');

    v_resumo := jsonb_build_object(
      'recebidos', v_recebidos, 'criados', v_criados, 'ligados', v_ligados,
      'atualizados', v_atualizados, 'ignorados', v_ignorados,
      'pendencias', jsonb_array_length(v_pendencias),
      'por_tipo', (select coalesce(jsonb_object_agg(s.tipo, s.n), '{}')
                     from (select p ->> 'tipo' as tipo, count(*) as n
                             from jsonb_array_elements(v_pendencias) p group by 1) s));

    if p_simular then
      raise exception 'Simulação desfeita.' using errcode = 'IDA01';
    end if;

    delete from cadastro.pendencias_da_tita where true;
    insert into cadastro.pendencias_da_tita (tipo, tita_id, assistido_id, nome, detalhe, quantidade)
    select x.tipo, x.tita_id, x.assistido_id, x.nome, x.detalhe, x.quantidade
      from jsonb_to_recordset(v_pendencias) as x (
             tipo text, tita_id bigint, assistido_id bigint, nome text, detalhe text,
             quantidade integer);
    insert into cadastro.sincronizacoes_da_tita (origem, pedida_por, resumo)
    values (p_origem, p_pedida_por, v_resumo);
  exception when sqlstate 'IDA01' then
    null; -- a simulação: o bloco foi desfeito, os números ficaram
  end;

  return v_resumo || jsonb_build_object('simulada', p_simular);
end;
$$;

-- A tentativa que não chegou a sincronizar (a Tita fora do ar, o token recusado).
create function cadastro.registrar_falha_da_tita(p_origem text, p_pedida_por bigint, p_erro text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into cadastro.sincronizacoes_da_tita (origem, pedida_por, erro)
  values (p_origem, p_pedida_por, left(coalesce(nullif(btrim(p_erro), ''), 'Falha sem detalhe.'), 300));
$$;

-- Quem pede a sincronização pela tela: o id da coordenação geral, ou nulo para os outros.
create function cadastro.quem_sincroniza_a_tita()
returns bigint
language sql
stable
set search_path = ''
as $$
  select interno.usuario_atual_id() where (select interno.eh_coordenacao_geral());
$$;

-- A sincronização agendada (pg_cron) se identifica com o token guardado no Vault com o nome
-- `tita_agendamento`. Sem o segredo, nenhum token vale.
create function cadastro.conferir_agendamento_da_tita(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_token) >= 32 and exists (
    select 1 from vault.decrypted_secrets s
     where s.name = 'tita_agendamento' and s.decrypted_secret = p_token
  ), false);
$$;

revoke all on function
  interno.guardar_rascunho(), interno.chave_do_nome(text),
  interno.pendencia_da_tita(text, bigint, bigint, text, text),
  cadastro.sincronizar_tita(jsonb, text, bigint, boolean, integer),
  cadastro.registrar_falha_da_tita(text, bigint, text),
  cadastro.quem_sincroniza_a_tita(),
  cadastro.conferir_agendamento_da_tita(text)
  from public, anon, authenticated;
grant execute on function
  cadastro.sincronizar_tita(jsonb, text, bigint, boolean, integer),
  cadastro.registrar_falha_da_tita(text, bigint, text),
  cadastro.conferir_agendamento_da_tita(text)
  to service_role;
grant execute on function cadastro.quem_sincroniza_a_tita() to authenticated, service_role;
