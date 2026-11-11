-- Testes de RLS e regras do banco. Rodam numa transação que termina com erro de propósito:
-- o `raise exception` final devolve o resultado e desfaz tudo, então nada fica gravado, nem os
-- usuários e assistidos fictícios criados aqui. Rode pelo SQL Editor ou pelo MCP do Supabase.
-- Saída esperada: "RESULTADO: 0 falhas de N".

create temp table resultado (n serial, teste text, ok boolean);
grant all on resultado to public;
grant all on sequence resultado_n_seq to public;

-- Contas fictícias no Auth (só existem dentro desta transação).
insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('a0000000-0000-4000-8000-000000000001', 'coord.a@exemplo.test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 'coord.b@exemplo.test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000003', 'geral@exemplo.test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000004', 'contas@exemplo.test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000005', 'inativo@exemplo.test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000006', 'sem.cadastro@exemplo.test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000007', 'nao.confirmado@exemplo.test', null, 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000008', 'email.corrigido@exemplo.test', now(), 'authenticated', 'authenticated');

-- O cadastro nasce depois da conta: o trigger liga pelo e-mail confirmado.
insert into acesso.usuarios (nome, email, papel, crp, ativo) values
  ('Coordenadora A', 'coord.a@exemplo.test', 'coordenador', '02/00001', true),
  ('Coordenador B', 'coord.b@exemplo.test', 'coordenador', '02/00002', true),
  ('Coordenação Geral', 'geral@exemplo.test', 'coordenacao_geral', null, true),
  ('Coordenação Geral Dois', 'geral.dois@exemplo.test', 'coordenacao_geral', null, true),
  ('Contas Médicas', 'contas@exemplo.test', 'contas_medicas', null, true),
  ('Coordenador Inativo', 'inativo@exemplo.test', 'coordenador', null, false),
  ('Não Confirmado', 'nao.confirmado@exemplo.test', 'coordenador', null, true);

insert into resultado (teste, ok) select 'vincula conta de e-mail confirmado',
  (select auth_user_id from acesso.usuarios where email = 'coord.a@exemplo.test')
    = 'a0000000-0000-4000-8000-000000000001';
insert into resultado (teste, ok) select 'não vincula e-mail não confirmado',
  (select auth_user_id is null from acesso.usuarios where email = 'nao.confirmado@exemplo.test');

-- CNPJs fictícios, um numérico e um alfanumérico (o exemplo da Receita).
insert into cadastro.unidades (sigla, nome, cnpj) values
  ('TST', 'Unidade Teste', '12345678000195'), ('TSX', 'Unidade X', '12ABC34501DE35');
insert into cadastro.planos (nome) values ('Plano Teste');
insert into cadastro.carteiras (unidade_id, turno, coordenador_id)
  select u.id, 'tarde', (select id from acesso.usuarios where email = 'coord.a@exemplo.test')
    from cadastro.unidades u where u.sigla = 'TST';
insert into cadastro.carteiras (unidade_id, turno, coordenador_id)
  select u.id, 'manha', (select id from acesso.usuarios where email = 'coord.b@exemplo.test')
    from cadastro.unidades u where u.sigla = 'TST';

insert into cadastro.assistidos (nome, genero, plano_id, unidade_id, carteira_id)
  select n, g::cadastro.genero, (select id from cadastro.planos where nome = 'Plano Teste'),
         c.unidade_id, c.id
    from (values ('Assistida Um Teste', 'feminino', 'tarde'),
                 ('Assistido Dois Teste', 'masculino', 'tarde'),
                 ('Assistido Tres Teste', 'masculino', 'manha')) v(n, g, t)
    join cadastro.carteiras c on c.turno = v.t::cadastro.turno
    join cadastro.unidades u on u.id = c.unidade_id and u.sigla = 'TST';

insert into resultado (teste, ok) select 'numera os assistidos na unidade (E16)',
  (select array_agg(sequencia order by sequencia) from cadastro.assistidos where nome like '%Teste')
    = array[1, 2, 3]::smallint[];

insert into evolucao.evolucoes (assistido_id, mes_ref, origem)
  select id, '2026-11-01', 'tita' from cadastro.assistidos where nome = 'Assistida Um Teste';
insert into evolucao.evolucoes (assistido_id, mes_ref, origem)
  select id, '2026-11-01', 'manual' from cadastro.assistidos where nome = 'Assistido Tres Teste';
-- As 4 partes nascem com a evolução; a Um Teste tem 2 conferidas.
update evolucao.partes pt set conferida = pt.numero <= 2
  from evolucao.evolucoes e
  join cadastro.assistidos a on a.id = e.assistido_id and a.nome = 'Assistida Um Teste'
 where pt.evolucao_id = e.id;

insert into resultado (teste, ok) select 'código da evolução UNI-AAMM-NNN-EV (E16)',
  (select e.codigo = 'TST-2611-' || lpad(a.sequencia::text, 3, '0') || '-EV'
     from evolucao.evolucoes e join cadastro.assistidos a on a.id = e.assistido_id
    where a.nome = 'Assistida Um Teste');
insert into resultado (teste, ok) select 'período analisado 01/10 a 31/10 (E18)',
  (select (e.periodo_inicio, e.periodo_fim) = (date '2026-10-01', date '2026-10-31')
     from evolucao.evolucoes e join cadastro.assistidos a on a.id = e.assistido_id
    where a.nome = 'Assistida Um Teste');

-- Regras do banco
do $$
begin
  begin
    insert into evolucao.evolucoes (assistido_id, mes_ref, origem)
      select id, '2026-11-01', 'tita' from cadastro.assistidos where nome = 'Assistida Um Teste';
    insert into resultado (teste, ok) values ('uma evolução por assistido e mês (E01)', false);
  exception when unique_violation then
    insert into resultado (teste, ok) values ('uma evolução por assistido e mês (E01)', true);
  end;
  begin
    insert into evolucao.evolucoes (assistido_id, mes_ref, origem)
      select id, '2026-11-15', 'tita' from cadastro.assistidos where nome = 'Assistido Dois Teste';
    insert into resultado (teste, ok) values ('mês da evolução só no dia 1º', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('mês da evolução só no dia 1º', true);
  end;
  begin
    insert into cadastro.carteiras (unidade_id, turno, coordenador_id)
      select u.id, 'integral', (select id from acesso.usuarios where email = 'contas@exemplo.test')
        from cadastro.unidades u where u.sigla = 'TSX';
    insert into resultado (teste, ok) values ('carteira só com coordenador', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('carteira só com coordenador', true);
  end;
  begin
    insert into cadastro.assistidos (nome, genero, unidade_id, carteira_id)
      select 'Sobrenome', 'feminino', c.unidade_id, c.id from cadastro.carteiras c limit 1;
    insert into resultado (teste, ok) values ('nome do assistido com sobrenome (E09)', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('nome do assistido com sobrenome (E09)', true);
  end;
  begin
    insert into cadastro.unidades (sigla, nome) values ('TSY', 'Unidade Y');
    insert into resultado (teste, ok) values ('unidade nova só com CNPJ', false);
  exception when not_null_violation then
    insert into resultado (teste, ok) values ('unidade nova só com CNPJ', true);
  end;
  begin
    insert into cadastro.unidades (sigla, nome, cnpj) values ('TSY', 'Unidade Y', '12345678000196');
    insert into resultado (teste, ok) values ('CNPJ com dígito errado não entra', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('CNPJ com dígito errado não entra', true);
  end;
end;
$$;

-- O id de um assistido da carteira do B, para a A tentar usar sem conseguir lê-lo.
select set_config('teste.assistido_do_b',
  (select id::text from cadastro.assistidos where nome = 'Assistido Tres Teste'), true);

-- Coordenadora A: vê só a carteira dela.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into resultado (teste, ok) select 'coordenador lê só a própria linha de usuário',
  (select count(*) from acesso.usuarios) = 1;
insert into resultado (teste, ok) select 'coordenador lê só os assistidos da carteira',
  (select count(*) from cadastro.assistidos where nome like '%Teste') = 2;
insert into resultado (teste, ok) select 'coordenador lê só as evoluções da carteira',
  (select count(*) from evolucao.evolucoes where codigo like 'TST-%') = 1;
insert into resultado (teste, ok) select 'coordenador lê as partes da evolução dele',
  (select count(*) from evolucao.partes) = 4;
insert into resultado (teste, ok) select 'lista do mês: 2 assistidos, 2 de 4 partes conferidas',
  (select count(*) = 2 and sum(coalesce(partes_conferidas, 0)) = 2
     from evolucao.evolucoes_do_mes('2026-11-01') where unidade_sigla = 'TST');
insert into resultado (teste, ok) select 'coordenador não lê a auditoria',
  (select count(*) from auditoria.eventos) = 0;
do $$
begin
  begin
    insert into cadastro.unidades (sigla, nome) values ('HACK', 'Invasora');
    insert into resultado (teste, ok) values ('coordenador não cria unidade', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não cria unidade', true);
  end;
  begin
    update acesso.usuarios set papel = 'coordenacao_geral' where email = 'coord.a@exemplo.test';
    insert into resultado (teste, ok) values ('coordenador não muda o próprio papel',
      (select papel = 'coordenador' from acesso.usuarios where email = 'coord.a@exemplo.test'));
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não muda o próprio papel', true);
  end;
  begin
    insert into evolucao.evolucoes (assistido_id, mes_ref, origem)
      select id, '2026-12-01', 'tita' from cadastro.assistidos where nome = 'Assistida Um Teste';
    insert into resultado (teste, ok) values ('coordenador não escolhe o mês da evolução', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não escolhe o mês da evolução', true);
  end;
  begin
    update acesso.usuarios set auth_user_id = null where email = 'coord.a@exemplo.test';
    insert into resultado (teste, ok) values ('ninguém altera auth_user_id pela API', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('ninguém altera auth_user_id pela API', true);
  end;
  begin
    insert into acesso.usuarios (nome, email, papel)
      values ('Intrusa', 'intrusa@exemplo.test', 'coordenacao_geral');
    insert into resultado (teste, ok) values ('coordenador não cadastra pessoa', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não cadastra pessoa', true);
  end;
end;
$$;

-- Evolução escrita à mão: cria no mês aberto, não conclui sem conferir, conclui com tudo.
do $$
declare
  nova uuid;
  dica text;
begin
  begin
    insert into evolucao.evolucoes (assistido_id)
      values (current_setting('teste.assistido_do_b')::bigint);
    insert into resultado (teste, ok) values ('coordenador não cria evolução de outra carteira', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não cria evolução de outra carteira', true);
  end;
  insert into evolucao.evolucoes (assistido_id)
    select id from cadastro.assistidos where nome = 'Assistido Dois Teste'
    returning id into nova;
  insert into resultado (teste, ok) select 'coordenador cria a evolução do mês aberto, com as 4 partes',
    (select e.mes_ref = date_trunc('month', now() at time zone 'America/Recife')::date
            and e.origem = 'manual'
       from evolucao.evolucoes e where e.id = nova)
    and (select count(*) from evolucao.partes where evolucao_id = nova) = 4;
  begin
    update evolucao.evolucoes set situacao = 'concluida' where id = nova;
    insert into resultado (teste, ok) values ('não conclui sem as 4 partes conferidas', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('não conclui sem as 4 partes conferidas', dica = 'partes_a_conferir');
  end;
  update evolucao.partes set conferida = true where evolucao_id = nova;
  insert into evolucao.versoes (evolucao_id, numero, conteudo) values
    (nova, 2, jsonb_build_object('abertura', '', 'programas', repeat('Texto fictício de teste. ', 30),
                                 'comportamentos', '', 'recursos', '', 'fechamento', '')),
    (nova, 3, '{"metas": ["Meta alcançada fictícia"]}'),
    (nova, 4, '{"metas": ["Meta um", "Meta dois", "Meta três", "Meta quatro"]}');
  update evolucao.partes set conferida = true where evolucao_id = nova;
  update evolucao.evolucoes set situacao = 'concluida' where id = nova;
  insert into resultado (teste, ok) select 'conclui com as 4 partes conferidas, o texto e as metas',
    (select situacao = 'concluida' and concluida_em is not null
       from evolucao.evolucoes where id = nova);
  insert into resultado (teste, ok) select 'a evolução inteira traz a versão atual de cada parte',
    (select jsonb_array_length(c -> 'versoes') = 3 and jsonb_array_length(c -> 'partes') = 4
            and (c ->> 'editavel')::boolean
       from evolucao.evolucao_completa(nova) c);
end;
$$;
reset role;

-- Coordenador B: não vê a carteira da A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into resultado (teste, ok) select 'outro coordenador não vê a carteira alheia',
  (select count(*) from cadastro.assistidos where nome like '%Teste') = 1
  and (select count(*) from evolucao.evolucoes where codigo like 'TST-%') = 1
  and (select count(distinct evolucao_id) from evolucao.partes) = 1;
reset role;

-- Coordenação geral: vê tudo e mantém o cadastro.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into resultado (teste, ok) select 'coordenação geral lê todos os assistidos e evoluções',
  (select count(*) from cadastro.assistidos where nome like '%Teste') = 3
  and (select count(*) from evolucao.evolucoes where codigo like 'TST-%') = 3;
insert into resultado (teste, ok) select 'coordenação geral filtra a lista por coordenador',
  (select count(*) from evolucao.evolucoes_do_mes('2026-11-01',
     (select id from acesso.usuarios where email = 'coord.b@exemplo.test'))
    where unidade_sigla = 'TST') = 1;
insert into resultado (teste, ok) select 'coordenação geral lê a auditoria',
  (select count(*) from auditoria.eventos where tabela = 'assistidos') >= 3;
update cadastro.planos set nome = 'Plano Teste Renomeado' where nome = 'Plano Teste';
insert into resultado (teste, ok) select 'coordenação geral altera o cadastro',
  exists (select 1 from cadastro.planos where nome = 'Plano Teste Renomeado');
update cadastro.unidades set cnpj = '87654321000198', endereco = 'Rua Fictícia, 100'
 where sigla = 'TSX';
insert into resultado (teste, ok) select 'coordenação geral grava CNPJ e endereço da unidade',
  exists (select 1 from cadastro.unidades where sigla = 'TSX' and cnpj = '87654321000198');

-- Pessoas: a coordenação geral cadastra e altera; o banco segura as travas. Os testes não
-- dependem de quantas coordenações gerais reais existem: desativar todas tem de falhar sempre.
insert into acesso.usuarios (nome, email, papel) values
  ('Pessoa Nova Teste', 'pessoa.nova@exemplo.test', 'contas_medicas');
insert into resultado (teste, ok) select 'coordenação geral cadastra pessoa',
  exists (select 1 from acesso.usuarios where email = 'pessoa.nova@exemplo.test');
update acesso.usuarios set ativo = false where email = 'geral.dois@exemplo.test';
insert into resultado (teste, ok) select 'desativa uma coordenação geral quando outra segue ativa',
  (select not ativo from acesso.usuarios where email = 'geral.dois@exemplo.test');
update acesso.usuarios set email = 'email.corrigido@exemplo.test'
 where email = 'nao.confirmado@exemplo.test';
insert into resultado (teste, ok) select 'corrige o e-mail de quem não tem conta e liga a conta',
  (select auth_user_id from acesso.usuarios where email = 'email.corrigido@exemplo.test')
    = 'a0000000-0000-4000-8000-000000000008';
update acesso.usuarios set papel = 'contas_medicas' where email = 'inativo@exemplo.test';
insert into resultado (teste, ok) select 'muda o papel de coordenador sem carteira',
  (select papel = 'contas_medicas' from acesso.usuarios where email = 'inativo@exemplo.test');
update acesso.usuarios set ativo = false where email = 'coord.b@exemplo.test';
insert into resultado (teste, ok) select 'desativa coordenador com carteira (o acesso cai na hora)',
  (select not ativo from acesso.usuarios where email = 'coord.b@exemplo.test');
do $$
declare
  dica text;
begin
  begin
    update acesso.usuarios set ativo = false where papel = 'coordenacao_geral';
    insert into resultado (teste, ok) values ('nunca fica sem coordenação geral ativa', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('nunca fica sem coordenação geral ativa', dica = 'ultima_coordenacao_geral');
  end;
  begin
    update acesso.usuarios set papel = 'coordenador' where papel = 'coordenacao_geral';
    insert into resultado (teste, ok) values ('nem tirando o papel de todas', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('nem tirando o papel de todas', dica = 'ultima_coordenacao_geral');
  end;
  begin
    update acesso.usuarios set email = 'trocado@exemplo.test' where email = 'coord.a@exemplo.test';
    insert into resultado (teste, ok) values ('e-mail de quem tem conta não muda', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('e-mail de quem tem conta não muda', dica = 'email_com_conta');
  end;
  begin
    update acesso.usuarios set papel = 'contas_medicas' where email = 'coord.a@exemplo.test';
    insert into resultado (teste, ok) values ('coordenador com carteira ativa não muda de papel', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('coordenador com carteira ativa não muda de papel', dica = 'coordenador_com_carteira');
  end;
end;
$$;

-- Carteiras: a desativada não guarda assistido ativo, dos dois lados.
insert into cadastro.carteiras (unidade_id, turno, coordenador_id, ativa)
  select u.id, 'integral', (select id from acesso.usuarios where email = 'coord.a@exemplo.test'), false
    from cadastro.unidades u where u.sigla = 'TSX';
do $$
declare
  dica text;
begin
  begin
    update cadastro.carteiras set ativa = false where turno = 'tarde'
       and unidade_id = (select id from cadastro.unidades where sigla = 'TST');
    insert into resultado (teste, ok) values ('carteira com assistidos ativos não se desativa', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('carteira com assistidos ativos não se desativa', dica = 'carteira_com_assistidos');
  end;
  begin
    insert into cadastro.assistidos (nome, genero, unidade_id, carteira_id)
      select 'Assistida Nova Teste', 'feminino', c.unidade_id, c.id
        from cadastro.carteiras c where not c.ativa;
    insert into resultado (teste, ok) values ('assistido não entra em carteira desativada', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('assistido não entra em carteira desativada', dica = 'carteira_desativada');
  end;
end;
$$;
update cadastro.assistidos set carteira_id = (
    select c.id from cadastro.carteiras c join cadastro.unidades u on u.id = c.unidade_id
     where u.sigla = 'TST' and c.turno = 'tarde')
 where nome = 'Assistido Tres Teste';
update cadastro.carteiras set ativa = false where turno = 'manha'
   and unidade_id = (select id from cadastro.unidades where sigla = 'TST');
insert into resultado (teste, ok) select 'desativa a carteira depois de passar os assistidos',
  not (select ativa from cadastro.carteiras where turno = 'manha'
        and unidade_id = (select id from cadastro.unidades where sigla = 'TST'));
reset role;

-- Assinatura (E14): o coordenador envia a imagem à própria pasta e grava o caminho.
select set_config('teste.id_a',
  (select id::text from acesso.usuarios where email = 'coord.a@exemplo.test'), true);
select set_config('teste.id_b',
  (select id::text from acesso.usuarios where email = 'coord.b@exemplo.test'), true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into storage.objects (bucket_id, name) values
  ('assinaturas', current_setting('teste.id_a') || '/00000000-0000-4000-8000-00000000000a.png');
insert into acesso.assinaturas (caminho) values
  (current_setting('teste.id_a') || '/00000000-0000-4000-8000-00000000000a.png');
insert into resultado (teste, ok) select 'coordenador grava a própria assinatura (E14)',
  (select usuario_id::text = current_setting('teste.id_a') from acesso.assinaturas);
do $$
begin
  begin
    insert into storage.objects (bucket_id, name) values
      ('assinaturas', current_setting('teste.id_b') || '/00000000-0000-4000-8000-00000000000b.png');
    insert into resultado (teste, ok) values ('não envia imagem à pasta de outro coordenador', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('não envia imagem à pasta de outro coordenador', true);
  end;
  begin
    insert into acesso.assinaturas (caminho) values
      (current_setting('teste.id_a') || '/00000000-0000-4000-8000-00000000000c.png');
    insert into resultado (teste, ok) values ('assinatura só com a imagem no Storage', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('assinatura só com a imagem no Storage', true);
  end;
end;
$$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into resultado (teste, ok) select 'coordenação geral lê a assinatura do coordenador',
  (select count(*) from acesso.assinaturas
    where usuario_id = current_setting('teste.id_a')::bigint) = 1
  and (select count(*) from storage.objects
        where bucket_id = 'assinaturas' and name like current_setting('teste.id_a') || '/%') = 1;
reset role;

-- Contas médicas: nesta etapa não lê assistido nem evolução (recebe só o arquivo do mês, E24).
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into resultado (teste, ok) select 'contas médicas não lê assistido nem evolução',
  (select count(*) from cadastro.assistidos) = 0
  and (select count(*) from evolucao.evolucoes) = 0
  and (select count(*) from evolucao.evolucoes_do_mes('2026-11-01')) = 0;
insert into resultado (teste, ok) select 'contas médicas não lê assinatura solta',
  (select count(*) from acesso.assinaturas) = 0
  and (select count(*) from storage.objects where bucket_id = 'assinaturas') = 0;
reset role;

-- Inativo e conta sem cadastro: nada.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into resultado (teste, ok) select 'usuário inativo não lê nada',
  (select count(*) from cadastro.unidades) = 0 and (select count(*) from cadastro.assistidos) = 0;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
insert into resultado (teste, ok) select 'conta do Auth sem cadastro não lê nada',
  (select count(*) from acesso.usuarios) = 0 and (select count(*) from cadastro.carteiras) = 0;
reset role;

-- Anônimo: sem acesso a nenhum schema do sistema.
insert into resultado (teste, ok) select 'anon sem uso dos schemas',
  not has_schema_privilege('anon', 'acesso', 'usage')
  and not has_schema_privilege('anon', 'cadastro', 'usage')
  and not has_schema_privilege('anon', 'evolucao', 'usage');
insert into resultado (teste, ok) select 'RLS ligado e forçado em todas as tabelas',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('acesso', 'cadastro', 'evolucao', 'auditoria') and c.relkind = 'r'
       and not (c.relrowsecurity and c.relforcerowsecurity));
insert into resultado (teste, ok) select 'funções de interno: anon nenhuma, authenticated só as das policies e checks',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'interno'
       and (has_function_privilege('anon', p.oid, 'execute')
            or (has_function_privilege('authenticated', p.oid, 'execute')
                and p.proname not in ('usuario_atual_id', 'usuario_ativo', 'eh_coordenacao_geral',
                                      'carteiras_do_usuario', 'assistidos_do_usuario',
                                      'cnpj_valido', 'evolucoes_do_usuario'))));
insert into resultado (teste, ok) select 'authenticated sem DELETE em nenhuma tabela',
  not exists (
    select 1 from information_schema.role_table_grants
     where grantee = 'authenticated' and privilege_type = 'DELETE'
       and table_schema in ('acesso', 'cadastro', 'evolucao', 'auditoria'));

do $$
declare
  falhas text;
  total int;
  nfalhas int;
begin
  select count(*), count(*) filter (where not coalesce(ok, false)),
         string_agg(teste, '; ' order by n) filter (where not coalesce(ok, false))
    into total, nfalhas, falhas
    from resultado;
  raise exception 'RESULTADO: % falhas de %. %', nfalhas, total, coalesce('Falharam: ' || falhas, '');
end;
$$;
