-- Arquivo do mês (E24): o que vai a contas médicas é o arquivo de cada carteira (unidade e
-- turno), com todas as evoluções dela, nunca a evolução de um assistido sozinha.
--
-- Enviar é gravar uma linha em `evolucao.arquivos` com a carteira. O resto é do banco, como nas
-- outras etapas: grants por coluna, RLS e triggers, sem função security definer exposta. O banco
-- define o mês (o aberto), quem assina e a assinatura da época, e recusa o envio:
--   sem assinatura cadastrada (E14);
--   com assistido ativo da carteira sem evolução ou com a evolução em conferência (E24);
--   sem nenhuma evolução concluída;
--   quando o arquivo da carteira naquele mês já foi.
-- Assistido sem sessão no mês sai pelo cadastro (P19): o arquivo leva só os ativos.
--
-- No envio, as evoluções concluídas da carteira ficam enviadas na mesma data e hora, ligadas ao
-- arquivo, e passam a ser só leitura (E13). Com o arquivo enviado, a carteira não abre evolução
-- nova naquele mês. Cada recusa tem errcode 23514 e um `hint` fixo, que a tela traduz.
--
-- Contas médicas lê os arquivos, as evoluções que estão num arquivo e os assistidos delas. O texto
-- das partes chega com o Word, na etapa seguinte.

-- ---------------------------------------------------------------------------------------------
-- 1. Funções auxiliares
-- ---------------------------------------------------------------------------------------------
create function interno.eh_contas_medicas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from acesso.usuarios u
     where u.auth_user_id = (select auth.uid()) and u.ativo and u.papel = 'contas_medicas'
  );
$$;

-- Como está a carteira no mês: só números, dos assistidos ativos. É a conta do envio e a da lista
-- de arquivos (contas médicas não lê os assistidos, mas vê quanto falta para o arquivo chegar).
create function interno.andamento_da_carteira(p_carteira bigint, p_mes date)
returns table (
  assistidos integer,
  sem_evolucao integer,
  em_conferencia integer,
  concluidas integer,
  enviadas integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer,
         count(*) filter (where e.id is null)::integer,
         count(*) filter (where e.situacao = 'em_conferencia')::integer,
         count(*) filter (where e.situacao = 'concluida')::integer,
         count(*) filter (where e.situacao = 'enviada')::integer
    from cadastro.assistidos a
    left join evolucao.evolucoes e on e.assistido_id = a.id and e.mes_ref = p_mes
   where a.carteira_id = p_carteira and a.ativo;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Tabela
-- ---------------------------------------------------------------------------------------------
-- Sem trigger de auditoria: a linha não se altera nem se apaga, e ela mesma é o registro do envio.
create table evolucao.arquivos (
  id bigint generated always as identity primary key,
  carteira_id bigint not null references cadastro.carteiras (id),
  mes_ref date not null check (extract(day from mes_ref) = 1),
  -- Quem assina: o coordenador da carteira no envio, com o nome, o CRP e a assinatura da época.
  coordenador_id bigint not null references acesso.usuarios (id),
  coordenador_nome text not null,
  coordenador_crp text,
  assinatura_id bigint not null references acesso.assinaturas (id),
  n_evolucoes smallint not null check (n_evolucoes > 0),
  enviado_em timestamptz not null default now(),
  enviado_por bigint not null references acesso.usuarios (id),
  unique (carteira_id, mes_ref) -- um arquivo por carteira e mês
);

create index arquivos_mes_idx on evolucao.arquivos (mes_ref);
create index arquivos_coordenador_idx on evolucao.arquivos (coordenador_id);
create index arquivos_assinatura_idx on evolucao.arquivos (assinatura_id);
create index arquivos_enviado_por_idx on evolucao.arquivos (enviado_por);

comment on table evolucao.arquivos is
  'Arquivo do mês de cada carteira enviado a contas médicas (E24). Só existe o que foi enviado.';

-- A evolução enviada aponta para o arquivo em que foi.
alter table evolucao.evolucoes
  add column arquivo_id bigint references evolucao.arquivos (id),
  add constraint evolucoes_enviada_no_arquivo check ((situacao = 'enviada') = (arquivo_id is not null));

create index evolucoes_arquivo_idx on evolucao.evolucoes (arquivo_id);

-- ---------------------------------------------------------------------------------------------
-- 3. O envio
-- ---------------------------------------------------------------------------------------------
-- Antes de gravar: quem envia é o coordenador da carteira, e o banco preenche o mês, quem assina e
-- a assinatura. A carteira fica travada até o fim, para não mudar de coordenador no meio.
create function interno.enviar_arquivo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu bigint := interno.usuario_atual_id();
  andamento record;
begin
  if eu is null then
    raise exception 'Sem acesso ativo ao sistema.' using errcode = '42501';
  end if;
  perform 1 from cadastro.carteiras c
   where c.id = new.carteira_id and c.coordenador_id = eu and c.ativa
     for share;
  if not found then
    raise exception 'Só o coordenador da carteira envia o arquivo do mês.' using errcode = '42501';
  end if;

  new.mes_ref := interno.mes_aberto();
  new.coordenador_id := eu;
  new.enviado_por := eu;
  new.enviado_em := now();
  if exists (
    select 1 from evolucao.arquivos ar
     where ar.carteira_id = new.carteira_id and ar.mes_ref = new.mes_ref
  ) then
    raise exception 'O arquivo deste mês já foi a contas médicas.'
      using errcode = '23514', hint = 'arquivo_ja_enviado';
  end if;

  select u.nome, u.crp into new.coordenador_nome, new.coordenador_crp
    from acesso.usuarios u where u.id = eu;
  select s.id into new.assinatura_id
    from acesso.assinaturas s where s.usuario_id = eu order by s.id desc limit 1;
  if new.assinatura_id is null then
    raise exception 'Cadastre a assinatura antes de enviar o arquivo do mês.'
      using errcode = '23514', hint = 'arquivo_sem_assinatura';
  end if;

  select * into andamento from interno.andamento_da_carteira(new.carteira_id, new.mes_ref);
  if andamento.sem_evolucao + andamento.em_conferencia > 0 then
    raise exception 'O arquivo só vai com a carteira toda concluída.'
      using errcode = '23514', hint = 'arquivo_com_pendencia';
  end if;
  if andamento.concluidas = 0 then
    raise exception 'A carteira não tem evolução concluída para enviar.'
      using errcode = '23514', hint = 'arquivo_vazio';
  end if;
  new.n_evolucoes := andamento.concluidas;
  return new;
end;
$$;

create trigger enviar_arquivo
  before insert on evolucao.arquivos
  for each row execute function interno.enviar_arquivo();

-- Depois de gravar: as evoluções concluídas da carteira vão no arquivo. Se a conta não fecha com a
-- de antes (alguém reabriu uma evolução no meio do envio), nada fica gravado.
create function interno.marcar_evolucoes_enviadas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  marcadas integer;
begin
  update evolucao.evolucoes e
     set situacao = 'enviada', arquivo_id = new.id
    from cadastro.assistidos a
   where a.id = e.assistido_id and a.carteira_id = new.carteira_id and a.ativo
     and e.mes_ref = new.mes_ref and e.situacao = 'concluida';
  get diagnostics marcadas = row_count;
  if marcadas <> new.n_evolucoes then
    raise exception 'A carteira mudou durante o envio. Confira as evoluções e envie de novo.'
      using errcode = '23514', hint = 'arquivo_com_pendencia';
  end if;
  return null;
end;
$$;

create trigger marcar_evolucoes_enviadas
  after insert on evolucao.arquivos
  for each row execute function interno.marcar_evolucoes_enviadas();

-- A situação (E13): concluída → enviada só pelo envio do arquivo, que é quem preenche `arquivo_id`
-- (a coluna não tem grant na API). A data e a hora são as do arquivo. Enviada não muda mais.
create or replace function interno.mudar_situacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = old.situacao then
    return new;
  end if;
  if old.situacao = 'enviada' then
    raise exception 'A evolução já foi a contas médicas no arquivo do mês.'
      using errcode = '23514', hint = 'evolucao_enviada';
  end if;
  if old.situacao = 'em_conferencia' and new.situacao = 'concluida' then
    perform interno.conferir_conclusao(new.id, new.assistido_id);
    new.concluida_em := now();
  elsif old.situacao = 'concluida' and new.situacao = 'em_conferencia' then
    new.concluida_em := null;
  elsif old.situacao = 'concluida' and new.situacao = 'enviada' and exists (
    select 1 from evolucao.arquivos ar
     where ar.id = new.arquivo_id and ar.mes_ref = new.mes_ref
  ) then
    select ar.enviado_em into new.enviada_em
      from evolucao.arquivos ar where ar.id = new.arquivo_id;
  else
    raise exception 'A evolução não pode ir de % para %.', old.situacao, new.situacao
      using errcode = '23514', hint = 'situacao_invalida';
  end if;
  return new;
end;
$$;

-- Nova evolução: como antes, e a carteira com o arquivo do mês enviado não abre outra.
create or replace function interno.abrir_evolucao()
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
  if exists (
    select 1 from cadastro.assistidos a
      join evolucao.arquivos ar on ar.carteira_id = a.carteira_id and ar.mes_ref = new.mes_ref
     where a.id = new.assistido_id
  ) then
    raise exception 'O arquivo deste mês já foi a contas médicas.'
      using errcode = '23514', hint = 'arquivo_ja_enviado';
  end if;
  return new;
end;
$$;

revoke all on function
  interno.eh_contas_medicas(), interno.andamento_da_carteira(bigint, date),
  interno.enviar_arquivo(), interno.marcar_evolucoes_enviadas()
  from public, anon, authenticated;
grant execute on function
  interno.eh_contas_medicas(), interno.andamento_da_carteira(bigint, date)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 4. Grants e RLS
-- ---------------------------------------------------------------------------------------------
-- O cliente manda só a carteira. Ninguém altera nem apaga um arquivo pela API.
revoke all on evolucao.arquivos from public, anon, authenticated;
grant select, insert (carteira_id) on evolucao.arquivos to authenticated;
grant all on evolucao.arquivos to service_role;

alter table evolucao.arquivos enable row level security;
alter table evolucao.arquivos force row level security;

-- Lê quem enviou, quem coordena a carteira hoje, a coordenação geral e contas médicas.
create policy quem_enviou_ou_recebe_le on evolucao.arquivos
  for select to authenticated
  using (
    (select interno.eh_coordenacao_geral())
    or (select interno.eh_contas_medicas())
    or coordenador_id = (select interno.usuario_atual_id())
    or carteira_id in (select interno.carteiras_do_usuario())
  );

create policy coordenador_envia on evolucao.arquivos
  for insert to authenticated
  with check (carteira_id in (select interno.carteiras_do_usuario()));

-- Contas médicas: só a evolução que está num arquivo, e o assistido dela.
create policy contas_medicas_le_as_enviadas on evolucao.evolucoes
  for select to authenticated
  using ((select interno.eh_contas_medicas()) and arquivo_id is not null);

create policy contas_medicas_le_os_de_arquivo on cadastro.assistidos
  for select to authenticated
  using (
    (select interno.eh_contas_medicas())
    and id in (select e.assistido_id from evolucao.evolucoes e where e.arquivo_id is not null)
  );

-- As partes e as versões seguem a evolução, menos para contas médicas: o texto chega com o Word,
-- e os rascunhos nunca chegam.
alter policy segue_a_evolucao on evolucao.partes
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
alter policy segue_a_evolucao on evolucao.versoes
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );

-- ---------------------------------------------------------------------------------------------
-- 5. As listas para as telas
-- ---------------------------------------------------------------------------------------------
-- As carteiras no mês: a que já enviou, com o arquivo, e a que ainda vai enviar, com o andamento.
-- O coordenador recebe as dele; a coordenação geral e contas médicas, todas. security invoker: o
-- RLS vale para quem chama (por isso contas médicas só recebe o nome de quem já enviou).
create function evolucao.arquivos_do_mes(p_mes date)
returns table (
  carteira_id bigint,
  unidade_sigla text,
  unidade_nome text,
  turno cadastro.turno,
  coordenador text,
  minha boolean,
  assistidos integer,
  sem_evolucao integer,
  em_conferencia integer,
  concluidas integer,
  com_assinatura boolean,
  arquivo_id bigint,
  enviado_em timestamptz,
  n_evolucoes integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, u.sigla, u.nome, c.turno,
         coalesce(ar.coordenador_nome, co.nome),
         c.id in (select interno.carteiras_do_usuario()),
         an.assistidos, an.sem_evolucao, an.em_conferencia, an.concluidas + an.enviadas,
         case when (select interno.eh_contas_medicas()) then null
              else exists (select 1 from acesso.assinaturas s where s.usuario_id = c.coordenador_id)
         end,
         ar.id, ar.enviado_em, ar.n_evolucoes::integer
    from cadastro.carteiras c
    join cadastro.unidades u on u.id = c.unidade_id
    left join acesso.usuarios co on co.id = c.coordenador_id
    left join evolucao.arquivos ar on ar.carteira_id = c.id and ar.mes_ref = p_mes
   cross join lateral interno.andamento_da_carteira(c.id, p_mes) an
   where ((select interno.eh_coordenacao_geral())
          or (select interno.eh_contas_medicas())
          or c.id in (select interno.carteiras_do_usuario()))
     and (ar.id is not null or (c.ativa and an.assistidos > 0))
   order by u.sigla, c.turno;
$$;

-- As evoluções de um arquivo, em ordem alfabética (E14), com o plano e o código (E24).
create function evolucao.evolucoes_do_arquivo(p_arquivo bigint)
returns table (evolucao_id uuid, codigo text, assistido text, plano text)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.id, e.codigo, a.nome, p.nome
    from evolucao.evolucoes e
    join cadastro.assistidos a on a.id = e.assistido_id
    left join cadastro.planos p on p.id = a.plano_id
   where e.arquivo_id = p_arquivo
   order by a.nome;
$$;

revoke all on function evolucao.arquivos_do_mes(date), evolucao.evolucoes_do_arquivo(bigint)
  from public, anon;
grant execute on function evolucao.arquivos_do_mes(date), evolucao.evolucoes_do_arquivo(bigint)
  to authenticated, service_role;
