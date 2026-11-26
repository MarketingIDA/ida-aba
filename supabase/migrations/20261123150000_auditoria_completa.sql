-- Módulo de auditoria: rastrear todas as ações dos usuários. Só a coordenação geral lê.
--
-- 1. Os gatilhos chegam às tabelas de negócio que ainda não tinham. As que guardam texto clínico,
--    a leitura do PDF ou o conteúdo das versões gravam o evento "resumido": a chave, a operação e
--    os campos que mudaram, sem copiar o texto (o próprio registro já é o histórico, e a cópia
--    duplicaria dado de saúde, LGPD). Ficam de fora as tabelas derivadas, que os triggers e a IA
--    preenchem a partir de outra (dias analisados, fontes, leituras e níveis de apoio, pendências
--    da Tita) e o espelho `assistidos_da_tita`, regravado a cada sincronização.
-- 2. Quem fez: o login de quem pede. Quando a Edge Function grava com a chave de serviço (as
--    versões da IA), ela manda o usuário no cabeçalho `x-auditoria-usuario`, lido só quando o
--    pedido vem com o papel `service_role`. Sem ninguém (a sincronização agendada), é o sistema.
-- 3. Entrar e sair: gatilho em `auth.sessions`.
-- 4. Ações que não gravam nada (abrir a evolução, baixar o Word): `evolucao.registrar_acao`, com
--    uma lista fechada de ações.
-- 5. Leitura: `acesso.eventos_de_auditoria`, só para a coordenação geral.

alter table auditoria.eventos
  drop constraint eventos_operacao_check,
  add constraint eventos_operacao_check check (operacao in ('I', 'U', 'D', 'A')),
  add column acao text,          -- só nas ações (operacao 'A'): entrou, saiu, abriu_evolucao…
  add column detalhes jsonb,     -- só nas ações: o que ajuda a entender (nome do arquivo, mês)
  add column resumido boolean not null default false;

create index eventos_usuario_idx on auditoria.eventos (usuario_id, id desc);

-- Quem fez: o login; senão, o usuário que a Edge Function mandou no cabeçalho (só com a chave de
-- serviço, que fica no servidor: ninguém de fora consegue se passar por outro).
create function interno.autor_da_auditoria()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  autor bigint := interno.usuario_atual_id();
  cabecalho text;
begin
  if autor is not null then
    return autor;
  end if;
  if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then
    return null;
  end if;
  cabecalho := nullif(current_setting('request.headers', true), '')::json ->> 'x-auditoria-usuario';
  if cabecalho is null or cabecalho !~ '^[0-9a-f-]{36}$' then
    return null;
  end if;
  select u.id into autor from acesso.usuarios u where u.auth_user_id = cabecalho::uuid;
  return autor;
end;
$$;

revoke all on function interno.autor_da_auditoria() from public, anon, authenticated;

-- O mesmo gatilho genérico, agora com o autor acima. O gatilho chamado `auditoria_resumida` não
-- copia as linhas: grava só a chave e os campos que mudaram.
create or replace function interno.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes jsonb;
  depois jsonb;
  alterados text[];
  chaves text[] := case when tg_nargs = 0 then array['id'] else tg_argv end;
  registro text;
  resumir boolean := tg_name = 'auditoria_resumida';
begin
  if tg_op in ('UPDATE', 'DELETE') then
    antes := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    depois := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(d.key order by d.key), '{}')
      into alterados
      from jsonb_each(depois) d
     where d.value is distinct from antes -> d.key
       and d.key not in ('atualizado_em', 'atualizado_por');
    if alterados = '{}' then
      return null; -- nada mudou de fato
    end if;
  end if;

  select string_agg(coalesce(depois, antes) ->> k, ':' order by ord)
    into registro
    from unnest(chaves) with ordinality as c(k, ord);

  if resumir then
    antes := null;
    depois := null;
  end if;

  insert into auditoria.eventos
    (schema_nome, tabela, registro_id, operacao, usuario_id, dados_antes, dados_depois,
     campos_alterados, resumido)
  values
    (tg_table_schema, tg_table_name, registro, left(tg_op, 1), interno.autor_da_auditoria(),
     antes, depois, alterados, resumir);

  return null;
end;
$$;

-- Tabelas com a linha inteira na auditoria.
do $$
declare
  t text;
begin
  foreach t in array array[
    'acesso.assinaturas',
    'cadastro.sincronizacoes_da_tita',
    'evolucao.arquivos',
    'evolucao.devolucoes',
    'evolucao.dicas_ia',
    'evolucao.relatorios_de_metas'
  ] loop
    execute format(
      'create trigger auditoria after insert or update or delete on %s
         for each row execute function interno.registrar_auditoria()', t);
  end loop;
end;
$$;

create trigger auditoria
  after insert or update or delete on evolucao.ciencias_da_importacao
  for each row execute function interno.registrar_auditoria('importacao_id');
create trigger auditoria
  after insert or update or delete on evolucao.lacunas_ignoradas
  for each row execute function interno.registrar_auditoria('evolucao_id', 'chave');

-- Tabelas com texto clínico ou o conteúdo das versões: evento resumido.
create trigger auditoria_resumida
  after insert or update or delete on evolucao.versoes
  for each row execute function interno.registrar_auditoria();
create trigger auditoria_resumida
  after insert or update or delete on evolucao.importacoes
  for each row execute function interno.registrar_auditoria();
create trigger auditoria_resumida
  after insert or update or delete on evolucao.documentos
  for each row execute function interno.registrar_auditoria();

-- Entrar e sair. Uma sessão nova do Auth é um login; a sessão apagada é a saída (ou o fim de
-- todas as outras sessões, ao trocar a senha). Falhar aqui nunca impede o login.
create function interno.registrar_sessao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sessao auth.sessions;
begin
  if tg_op = 'INSERT' then
    sessao := new;
  else
    sessao := old;
  end if;
  begin
    insert into auditoria.eventos
      (schema_nome, tabela, registro_id, operacao, usuario_id, acao, detalhes)
    select 'auth', 'sessions', sessao.id::text, 'A', u.id,
           case when tg_op = 'INSERT' then 'entrou' else 'saiu' end,
           case when tg_op = 'INSERT'
                then jsonb_strip_nulls(jsonb_build_object('navegador', sessao.user_agent,
                                                          'ip', host(sessao.ip)))
           end
      from acesso.usuarios u
     where u.auth_user_id = sessao.user_id;
  exception when others then
    raise warning 'auditoria da sessão não gravada: %', sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function interno.registrar_sessao() from public, anon, authenticated;
grant execute on function interno.registrar_sessao() to supabase_auth_admin;

create trigger auditoria
  after insert or delete on auth.sessions
  for each row execute function interno.registrar_sessao();

-- Ações sem gravação: o navegador avisa. O autor é sempre o login de quem chama, e a ação vem de
-- uma lista fechada.
create function evolucao.registrar_acao(p_acao text, p_registro text, p_detalhes jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  autor bigint := interno.usuario_atual_id();
begin
  if autor is null then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  if p_acao not in (
    'abriu_evolucao',        -- registro: id da evolução
    'abriu_progresso',       -- registro: id do assistido
    'abriu_metas',           -- registro: id do assistido
    'baixou_evolucao_word',  -- registro: id da evolução
    'baixou_arquivo_word'    -- registro: id do arquivo do mês ou "carteira:mês" na prévia
  ) then
    raise exception 'ação desconhecida' using errcode = '22023';
  end if;
  insert into auditoria.eventos
    (schema_nome, tabela, registro_id, operacao, usuario_id, acao, detalhes)
  values
    ('app', 'acoes', left(p_registro, 100), 'A', autor, p_acao,
     case when p_detalhes is null or jsonb_typeof(p_detalhes) <> 'object' then null
          when length(p_detalhes::text) > 2000 then null
          else p_detalhes end);
end;
$$;

revoke all on function evolucao.registrar_acao(text, text, jsonb) from public, anon;
grant execute on function evolucao.registrar_acao(text, text, jsonb) to authenticated;

-- A leitura: da mais nova para a mais antiga, em páginas (`p_antes_de` é o último id visto).
create function acesso.eventos_de_auditoria(
  p_de        timestamptz default null,
  p_ate       timestamptz default null,
  p_usuario   bigint default null,
  p_tabela    text default null,
  p_registro  text default null,
  p_antes_de  bigint default null,
  p_limite    integer default 50
)
returns table (
  id               bigint,
  ocorrido_em      timestamptz,
  usuario_id       bigint,
  usuario_nome     text,
  schema_nome      text,
  tabela           text,
  registro_id      text,
  operacao         text,
  acao             text,
  campos_alterados text[],
  dados_antes      jsonb,
  dados_depois     jsonb,
  detalhes         jsonb,
  resumido         boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select interno.eh_coordenacao_geral()) then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  return query
    select e.id, e.ocorrido_em, e.usuario_id, u.nome, e.schema_nome, e.tabela, e.registro_id,
           e.operacao::text, e.acao, e.campos_alterados, e.dados_antes, e.dados_depois,
           e.detalhes, e.resumido
      from auditoria.eventos e
      left join acesso.usuarios u on u.id = e.usuario_id
     where (p_de is null or e.ocorrido_em >= p_de)
       and (p_ate is null or e.ocorrido_em < p_ate)
       and (p_usuario is null or e.usuario_id = p_usuario)
       and (p_tabela is null or e.tabela = p_tabela or e.acao = p_tabela)
       and (p_registro is null or e.registro_id = p_registro)
       and (p_antes_de is null or e.id < p_antes_de)
     order by e.id desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end;
$$;

revoke all on function acesso.eventos_de_auditoria(timestamptz, timestamptz, bigint, text, text, bigint, integer)
  from public, anon;
grant execute on function acesso.eventos_de_auditoria(timestamptz, timestamptz, bigint, text, text, bigint, integer)
  to authenticated;
