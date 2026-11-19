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
-- Um rascunho da IA na parte 3 da Um Teste (só o servidor grava `autor = 'ia'`): a dica parte dele.
insert into evolucao.versoes (evolucao_id, numero, conteudo, autor)
  select e.id, 3, '{"metas": ["Meta fictícia da IA", "Outra meta fictícia da IA"]}', 'ia'
    from evolucao.evolucoes e join cadastro.assistidos a on a.id = e.assistido_id
   where a.nome = 'Assistida Um Teste';

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
select set_config('teste.assistido_dois',
  (select id::text from cadastro.assistidos where nome = 'Assistido Dois Teste'), true);

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
-- Registro do relatório de metas (E28): quem fez e quando vêm do banco, não do cliente.
insert into evolucao.relatorios_de_metas (assistido_id, acao)
  values (current_setting('teste.assistido_dois')::bigint, 'baixou');
insert into resultado (teste, ok) select 'coordenador registra o download do relatório de metas, com o próprio nome (E28)',
  (select count(*) = 1 and bool_and(acao = 'baixou' and feito_por_nome = 'Coordenadora A')
     from evolucao.relatorios_de_metas);
do $$
begin
  insert into evolucao.relatorios_de_metas (assistido_id, acao, feito_por)
    values (current_setting('teste.assistido_dois')::bigint, 'enviou', 1);
  insert into resultado (teste, ok) values ('o cliente não escolhe quem fez o registro (E28)', false);
exception when insufficient_privilege then
  insert into resultado (teste, ok) values ('o cliente não escolhe quem fez o registro (E28)', true);
end;
$$;
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

-- Dica para a IA (E21): parte do texto que a IA escreveu naquele bloco, e nasce pendente.
insert into evolucao.dicas_ia (evolucao_id, campo, dica)
  select e.id, 'metas_alcancadas', d.dica
    from evolucao.evolucoes e,
         (values ('  Dica fictícia para a IA.  '), ('Dica fictícia a descartar.')) d(dica)
   where e.codigo like 'TST-%';
insert into resultado (teste, ok) select 'coordenador dá a dica para a IA, com o texto original da IA (E21)',
  (select count(*) = 2
          and bool_and(situacao = 'pendente' and criado_por_nome = 'Coordenadora A'
                       and texto_original = 'Meta fictícia da IA' || chr(10) || 'Outra meta fictícia da IA')
          and count(*) filter (where dica = 'Dica fictícia para a IA.') = 1
     from evolucao.dicas_ia where dica like 'Dica fictícia%');
-- A variável é `pista`, não `dica`: `dica` também é coluna de dicas_ia, e o PL/pgSQL recusa o nome
-- ambíguo.
do $$
declare
  pista text;
begin
  begin
    insert into evolucao.dicas_ia (evolucao_id, campo, dica)
      select e.id, 'abertura', 'Dica fictícia sem texto da IA.'
        from evolucao.evolucoes e where e.codigo like 'TST-%';
    insert into resultado (teste, ok) values ('sem texto da IA no bloco, não há dica (E21)', false);
  exception when check_violation then
    get stacked diagnostics pista = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('sem texto da IA no bloco, não há dica (E21)', pista = 'dica_sem_texto_da_ia');
  end;
  begin
    insert into evolucao.orientacoes_ia (dica_id, texto)
      select id, 'Orientação fictícia indevida.' from evolucao.dicas_ia
       where dica = 'Dica fictícia para a IA.';
    insert into resultado (teste, ok) values ('coordenador não aprova dica (E22)', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não aprova dica (E22)', true);
  end;
end;
$$;

-- Outros documentos (E25): o texto já sem o nome; sem o nome no texto, só com a confirmação.
insert into evolucao.documentos (evolucao_id, arquivo_nome, tipo, data_documento, paginas, texto, trocas, confirmado)
  select e.id, v.arq, v.tp::evolucao.tipo_de_documento, date '2026-10-20', 1, v.txt, v.n, v.conf
    from evolucao.evolucoes e,
         (values ('Relatorio escolar ficticio.pdf', 'escola', 'A assistida participa das atividades fictícias.', 2, false),
                 ('Bilhete ficticio.docx', 'familia', 'Bilhete fictício sem o nome.', 0, true)) v(arq, tp, txt, n, conf)
   where e.codigo like 'TST-%';
insert into resultado (teste, ok) select 'coordenador junta outros documentos à evolução (E25)',
  (select count(*) = 2 and bool_and(ativo and criado_por is not null)
     from evolucao.documentos where arquivo_nome like '%ficticio%');
do $$
declare
  pista text;
begin
  begin
    insert into evolucao.documentos (evolucao_id, arquivo_nome, texto, trocas)
      select e.id, 'Sem nome ficticio.pdf', 'Texto fictício sem o nome.', 0
        from evolucao.evolucoes e where e.codigo like 'TST-%';
    insert into resultado (teste, ok) values ('sem o nome no texto, só entra com a confirmação (E25)', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('sem o nome no texto, só entra com a confirmação (E25)', true);
  end;
  begin
    insert into evolucao.documentos (evolucao_id, arquivo_nome, data_documento, texto, trocas)
      select e.id, 'Futuro ficticio.pdf', current_date + 10, 'A assistida, texto fictício.', 1
        from evolucao.evolucoes e where e.codigo like 'TST-%';
    insert into resultado (teste, ok) values ('documento com data no futuro não entra (E25)', false);
  exception when check_violation then
    get stacked diagnostics pista = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('documento com data no futuro não entra (E25)', pista = 'documento_data_futura');
  end;
  begin
    update evolucao.documentos set texto = 'Texto trocado.' where arquivo_nome like '%ficticio%';
    insert into resultado (teste, ok) values ('o texto lido do documento não muda depois (E25)', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('o texto lido do documento não muda depois (E25)', true);
  end;
end;
$$;
update evolucao.documentos set ativo = false, tipo = 'outro' where arquivo_nome = 'Bilhete ficticio.docx';
insert into resultado (teste, ok) select 'coordenador tira o documento da lista sem apagar (E25)',
  (select count(*) = 2 and count(*) filter (where not ativo and tipo = 'outro' and atualizado_em is not null) = 1
     from evolucao.documentos where arquivo_nome like '%ficticio%');

-- Evolução escrita à mão: cria no mês aberto, não conclui sem conferir, conclui com tudo.
do $$
declare
  nova uuid;
  dica text;
  imp bigint;
  meta_dois bigint;
  inicio date := (date_trunc('month', now() at time zone 'America/Recife') - interval '1 month')::date;
  fim date := date_trunc('month', now() at time zone 'America/Recife')::date - 1;
begin
  begin
    insert into evolucao.evolucoes (assistido_id)
      values (current_setting('teste.assistido_do_b')::bigint);
    insert into resultado (teste, ok) values ('coordenador não cria evolução de outra carteira', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não cria evolução de outra carteira', true);
  end;
  -- Cadastro de metas (E23): só dos assistidos da carteira de quem cadastra.
  insert into cadastro.metas (assistido_id, programa, texto, criterio)
    select id, 'Programa fictício', 'Meta fictícia do cadastro', 'Critério fictício'
      from cadastro.assistidos where nome = 'Assistido Dois Teste';
  insert into resultado (teste, ok) select 'coordenador cadastra meta do assistido da carteira (E23)',
    (select count(*) = 1 and bool_and(situacao = 'desenvolvimento')
       from cadastro.metas where texto = 'Meta fictícia do cadastro');
  begin
    insert into cadastro.metas (assistido_id, texto, criterio)
      values (current_setting('teste.assistido_do_b')::bigint, 'Meta fictícia alheia', 'Critério fictício');
    insert into resultado (teste, ok) values ('coordenador não cadastra meta de outra carteira (E23)', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não cadastra meta de outra carteira (E23)', true);
  end;
  insert into evolucao.evolucoes (assistido_id)
    select id from cadastro.assistidos where nome = 'Assistido Dois Teste'
    returning id into nova;
  insert into resultado (teste, ok) select 'coordenador cria a evolução do mês aberto, com as 4 partes',
    (select e.mes_ref = date_trunc('month', now() at time zone 'America/Recife')::date
            and e.origem = 'manual'
       from evolucao.evolucoes e where e.id = nova)
    and (select count(*) from evolucao.partes where evolucao_id = nova) = 4;
  -- PDF do Tita (E03, E20): o favorecido tem de ser o assistido; os dias são só os do período.
  begin
    insert into evolucao.importacoes (evolucao_id, arquivo_nome, favorecido, analises) values
      (nova, 'ficticio.pdf',
       jsonb_build_object('nome', 'Outro Nome Teste', 'periodo_inicio', inicio, 'periodo_fim', fim,
                          'filtro_terapia', 'ABA', 'filtro_profissional', 'Todos'),
       jsonb_build_array(jsonb_build_object('data', inicio, 'texto', 'Análise fictícia.', 'falta', false)));
    insert into resultado (teste, ok) values ('PDF do Tita de outro favorecido não entra (E03)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('PDF do Tita de outro favorecido não entra (E03)', dica = 'tita_outro_assistido');
  end;
  insert into evolucao.importacoes (evolucao_id, arquivo_nome, favorecido, analises) values
    (nova, 'ficticio.pdf',
     jsonb_build_object('nome', 'ASSISTIDO  DOIS teste', 'periodo_inicio', inicio, 'periodo_fim', fim,
                        'filtro_terapia', 'ABA', 'filtro_profissional', 'Todos'),
     jsonb_build_array(
       jsonb_build_object('data', inicio, 'texto', 'Análise fictícia um.', 'falta', false),
       jsonb_build_object('data', inicio, 'texto', 'Análise fictícia dois.', 'falta', false),
       jsonb_build_object('data', inicio + 1, 'texto', 'Não compareceu.', 'falta', true),
       jsonb_build_object('data', inicio - 1, 'texto', 'De fora do período.', 'falta', false)));
  insert into resultado (teste, ok) select 'importa o PDF do Tita: dias analisados só do período, e a origem vira tita (E20)',
    (select count(*) = 2 and sum(n_evolucoes) = 3 and count(*) filter (where falta) = 1
       from evolucao.dias_analisados where evolucao_id = nova)
    and (select origem = 'tita' from evolucao.evolucoes where id = nova);
  -- Nível de apoio (E27): só o servidor grava, e o coordenador lê o da própria carteira.
  select max(id) into imp from evolucao.importacoes where evolucao_id = nova;
  select id into meta_dois from cadastro.metas where texto = 'Meta fictícia do cadastro';
  execute 'set local role service_role';
  perform evolucao.gravar_niveis(imp, 'lida', jsonb_build_array(jsonb_build_object(
    'meta_id', meta_dois, 'data', inicio, 'nivel', 3, 'trecho', 'Análise fictícia um.')));
  begin
    perform evolucao.gravar_niveis(imp, 'lida', jsonb_build_array(jsonb_build_object(
      'meta_id', meta_dois, 'data', inicio - 1, 'nivel', 3, 'trecho', 'De fora do período.')));
    insert into resultado (teste, ok) values ('nível de apoio de dia fora do período não entra (E27)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('nível de apoio de dia fora do período não entra (E27)', dica = 'nivel_invalido');
  end;
  execute 'set local role authenticated';
  insert into resultado (teste, ok) select 'coordenador lê o nível de apoio e a leitura da própria carteira (E27)',
    (select count(*) = 1 and bool_and(nivel = 3) from evolucao.niveis_de_apoio where evolucao_id = nova)
    and (select situacao = 'lida' and dias = 1 and metas = 1
           from evolucao.leituras_de_nivel where evolucao_id = nova);
  begin
    insert into evolucao.niveis_de_apoio (meta_id, data, evolucao_id, nivel, trecho)
      values (meta_dois, inicio + 2, nova, 5, 'Inventado.');
    insert into resultado (teste, ok) values ('o cliente não grava o nível de apoio (E27)', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('o cliente não grava o nível de apoio (E27)',
      not has_function_privilege('authenticated', 'evolucao.gravar_niveis(bigint, text, jsonb)', 'execute'));
  end;
  -- Mediana da carteira (E27): só os assistidos lidos contam, sem identificar ninguém, e cada um
  -- só alcança a carteira que já lê.
  insert into resultado (teste, ok) select 'mediana da carteira: só o assistido lido entra, e sem meta independente conta zero (E27)',
    (select count(*) = 1 and bool_and(independente_em is null) and bool_and(assistido = 1)
       from evolucao.independencia_da_carteira(
         (select assistido_id from evolucao.evolucoes where id = nova), inicio, fim));
  execute 'set local role service_role';
  perform evolucao.gravar_niveis(imp, 'lida', jsonb_build_array(jsonb_build_object(
    'meta_id', meta_dois, 'data', inicio + 3, 'nivel', 5, 'trecho', 'Análise fictícia um.')));
  execute 'set local role authenticated';
  insert into resultado (teste, ok) select 'mediana da carteira: o dia em que a meta chegou à independência (E27)',
    (select count(*) = 1 and bool_and(independente_em = inicio + 3)
       from evolucao.independencia_da_carteira(
         (select assistido_id from evolucao.evolucoes where id = nova), inicio, fim));
  perform set_config('teste.assistido_lido',
    (select assistido_id from evolucao.evolucoes where id = nova)::text, true);
  perform set_config('request.jwt.claims',
    '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into resultado (teste, ok) select 'mediana da carteira: outro coordenador não alcança a carteira alheia (E27)',
    (select count(*) = 0 from evolucao.independencia_da_carteira(
       current_setting('teste.assistido_lido')::bigint, inicio, fim));
  perform set_config('request.jwt.claims',
    '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into resultado (teste, ok) select 'mediana da carteira: contas médicas não lê (E27)',
    (select count(*) = 0 from evolucao.independencia_da_carteira(
       current_setting('teste.assistido_lido')::bigint, inicio, fim));
  perform set_config('request.jwt.claims',
    '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into resultado (teste, ok) select 'mediana da carteira: a coordenação geral lê (E27)',
    (select count(*) = 1 from evolucao.independencia_da_carteira(
       current_setting('teste.assistido_lido')::bigint, inicio, fim));
  perform set_config('request.jwt.claims',
    '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  -- Importar de novo apaga os níveis do PDF anterior; a leitura atrasada do anterior é recusada.
  insert into evolucao.importacoes (evolucao_id, arquivo_nome, favorecido, analises)
    select evolucao_id, 'ficticio-2.pdf', favorecido, analises from evolucao.importacoes where id = imp;
  insert into resultado (teste, ok) select 'importar de novo apaga o nível de apoio do PDF anterior (E27)',
    (select count(*) from evolucao.niveis_de_apoio where evolucao_id = nova) = 0
    and (select count(*) from evolucao.leituras_de_nivel where evolucao_id = nova) = 0;
  execute 'set local role service_role';
  begin
    perform evolucao.gravar_niveis(imp, 'lida', '[]'::jsonb);
    insert into resultado (teste, ok) values ('leitura do PDF que já não vale é recusada (E27)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('leitura do PDF que já não vale é recusada (E27)', dica = 'leitura_desatualizada');
  end;
  perform evolucao.gravar_niveis((select max(id) from evolucao.importacoes where evolucao_id = nova),
    'lida', jsonb_build_array(jsonb_build_object(
      'meta_id', meta_dois, 'data', inicio, 'nivel', 4, 'trecho', 'Análise fictícia um.')));
  execute 'set local role authenticated';
  begin
    update evolucao.evolucoes set situacao = 'concluida' where id = nova;
    insert into resultado (teste, ok) values ('não conclui sem as 4 partes conferidas', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('não conclui sem as 4 partes conferidas', dica = 'partes_a_conferir');
  end;
  update evolucao.partes set conferida = true where evolucao_id = nova;
  -- Um rascunho da parte 2, antes da versão final: contas médicas não pode chegar a ele.
  insert into evolucao.versoes (evolucao_id, numero, conteudo) values
    (nova, 2, jsonb_build_object('abertura', 'Rascunho fictício.', 'programas', '',
                                 'comportamentos', '', 'recursos', '', 'fechamento', ''));
  insert into evolucao.versoes (evolucao_id, numero, conteudo) values
    (nova, 2, jsonb_build_object('abertura', '', 'programas', repeat('Texto fictício de teste. ', 30),
                                 'comportamentos', '', 'recursos', '', 'fechamento', '')),
    (nova, 3, '{"metas": ["Meta fictícia do cadastro."]}'),
    (nova, 4, '{"metas": ["Meta um", "Meta dois", "Meta três", "meta ficticia do cadastro"]}');
  update evolucao.partes set conferida = true where evolucao_id = nova;
  -- Lacuna (E10): o programa da meta nova não aparece nas análises (não tem nível lido).
  insert into cadastro.metas (assistido_id, programa, texto, criterio)
    select assistido_id, 'Programa ausente', 'Outra meta fictícia', 'Critério fictício'
      from evolucao.evolucoes where id = nova;
  insert into resultado (teste, ok) select 'lacuna: o programa que não aparece nas análises fica aberto (E10)',
    (select count(*) = 1 and bool_and(programa = 'Programa ausente' and situacao = 'aberta')
       from evolucao.lacunas(nova));
  begin
    update evolucao.evolucoes set situacao = 'concluida' where id = nova;
    insert into resultado (teste, ok) values ('lacuna aberta não deixa concluir (E10)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok) values ('lacuna aberta não deixa concluir (E10)', dica = 'lacuna_aberta');
  end;
  insert into evolucao.lacunas_ignoradas (evolucao_id, programa) values (nova, ' programa AUSENTE ');
  insert into resultado (teste, ok) select 'coordenador ignora a lacuna, com o nome de quem ignorou (E10)',
    (select situacao = 'ignorada' and ignorada_por = 'Coordenadora A' from evolucao.lacunas(nova));
  begin
    update evolucao.evolucoes set situacao = 'concluida' where id = nova;
    insert into resultado (teste, ok) values ('meta alcançada não volta às metas para o mês atual (E12)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('meta alcançada não volta às metas para o mês atual (E12)', dica = 'meta_ja_alcancada');
  end;
  -- Fontes por frase (E06): só o servidor grava; o coordenador lê as da carteira dele.
  begin
    insert into evolucao.fontes (versao_id, campo, ordem, frase)
      select max(id), 'programas', 0, 'Frase inventada.' from evolucao.versoes
       where evolucao_id = nova and numero = 2;
    insert into resultado (teste, ok) values ('o cliente não grava as fontes (E06)', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('o cliente não grava as fontes (E06)', true);
  end;
  execute 'set local role service_role';
  insert into evolucao.fontes (versao_id, campo, ordem, frase, datas)
    select max(id), 'programas', 0, 'Frase fictícia da IA.', array[inicio] from evolucao.versoes
     where evolucao_id = nova and numero = 2;
  execute 'set local role authenticated';
  insert into resultado (teste, ok) select 'coordenador lê as fontes da evolução dele (E06)',
    (select count(*) = 1 and bool_and(datas = array[inicio]) from evolucao.fontes);
  insert into evolucao.versoes (evolucao_id, numero, conteudo) values
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
  begin
    insert into evolucao.devolucoes (evolucao_id, motivo)
      values (nova, 'Motivo fictício da devolução.');
    insert into resultado (teste, ok) values ('coordenador não devolve evolução (E13)', false);
  exception when insufficient_privilege then
    insert into resultado (teste, ok) values ('coordenador não devolve evolução (E13)', true);
  end;
  begin
    insert into evolucao.arquivos (carteira_id) select interno.carteiras_do_usuario();
    insert into resultado (teste, ok) values ('arquivo do mês não vai sem assinatura (E14)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('arquivo do mês não vai sem assinatura (E14)', dica = 'arquivo_sem_assinatura');
  end;
end;
$$;
reset role;

-- Coordenador B: não vê a carteira da A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into resultado (teste, ok) select 'outro coordenador não vê a carteira alheia',
  (select count(*) from cadastro.assistidos where nome like '%Teste') = 1
  and (select count(*) from evolucao.evolucoes where codigo like 'TST-%') = 1
  and (select count(distinct evolucao_id) from evolucao.partes) = 1
  and (select count(*) from evolucao.documentos) = 0;
insert into resultado (teste, ok) select 'outro coordenador não lê o nível de apoio alheio (E27)',
  (select count(*) from evolucao.niveis_de_apoio) = 0
  and (select count(*) from evolucao.leituras_de_nivel) = 0;
do $$
begin
  insert into evolucao.relatorios_de_metas (assistido_id, acao)
    values (current_setting('teste.assistido_dois')::bigint, 'baixou');
  insert into resultado (teste, ok) values ('outro coordenador não registra nem lê o relatório de metas alheio (E28)', false);
exception when insufficient_privilege then
  insert into resultado (teste, ok) values ('outro coordenador não registra nem lê o relatório de metas alheio (E28)',
    (select count(*) from evolucao.relatorios_de_metas) = 0);
end;
$$;
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
insert into resultado (teste, ok) select 'coordenação geral lê o registro do relatório de metas (E28)',
  (select count(*) from evolucao.relatorios_de_metas) = 1;
update cadastro.metas set situacao = 'suspensa' where texto = 'Meta fictícia do cadastro';
insert into resultado (teste, ok) select 'coordenação geral lê as metas e não altera (E23)',
  (select count(*) = 1 and bool_and(situacao = 'desenvolvimento')
     from cadastro.metas where texto = 'Meta fictícia do cadastro');
insert into evolucao.devolucoes (evolucao_id, motivo)
  select e.id, '  Motivo fictício da devolução.  '
    from evolucao.evolucoes e join cadastro.assistidos a on a.id = e.assistido_id
   where a.nome = 'Assistido Dois Teste';
insert into resultado (teste, ok) select 'coordenação geral devolve a concluída com o motivo, e ela volta para conferência (E13)',
  (select e.situacao = 'em_conferencia' and e.concluida_em is null
          and jsonb_array_length(evolucao.evolucao_completa(e.id) -> 'devolucoes') = 1
     from evolucao.evolucoes e join cadastro.assistidos a on a.id = e.assistido_id
    where a.nome = 'Assistido Dois Teste')
  and (select count(*) = 1
              and bool_and(not d.resolvida and d.motivo = 'Motivo fictício da devolução.'
                           and d.devolvida_por_nome = 'Coordenação Geral')
         from evolucao.devolucoes d)
  and (select bool_and(l.devolvida)
         from evolucao.evolucoes_do_mes(date_trunc('month', now() at time zone 'America/Recife')::date) l
        where l.nome = 'Assistido Dois Teste');
update cadastro.planos set nome = 'Plano Teste Renomeado' where nome = 'Plano Teste';
insert into resultado (teste, ok) select 'coordenação geral altera o cadastro',
  exists (select 1 from cadastro.planos where nome = 'Plano Teste Renomeado');
update cadastro.unidades set cnpj = '87654321000198', endereco = 'Rua Fictícia, 100'
 where sigla = 'TSX';
insert into resultado (teste, ok) select 'coordenação geral grava CNPJ e endereço da unidade',
  exists (select 1 from cadastro.unidades where sigla = 'TSX' and cnpj = '87654321000198');
-- Termos inadequados (P12): a coordenação geral mantém a lista, sem repetir termo ativo.
insert into cadastro.termos_inadequados (termo, substituto)
  values ('termo fictício de teste', 'substituto fictício');
do $$
begin
  insert into cadastro.termos_inadequados (termo, substituto)
    values ('Termo  Ficticio de TESTE', 'outro substituto');
  insert into resultado (teste, ok)
    values ('coordenação geral cadastra termo inadequado, sem repetir (P12)', false);
exception when unique_violation then
  insert into resultado (teste, ok)
    values ('coordenação geral cadastra termo inadequado, sem repetir (P12)',
            (select count(*) = 1 from cadastro.termos_inadequados
              where termo = 'termo fictício de teste' and ativo));
end;
$$;

-- Curadoria (E22): aprovar grava a orientação e decide a dica; descartar leva o motivo; a
-- orientação se retira.
insert into evolucao.orientacoes_ia (dica_id, texto)
  select id, '  Orientação fictícia para a IA.  ' from evolucao.dicas_ia
   where dica = 'Dica fictícia para a IA.';
insert into resultado (teste, ok) select 'coordenação geral aprova a dica, que vira orientação (E22)',
  (select count(*) = 1
          and bool_and(o.campo = 'metas_alcancadas' and o.ativa
                       and o.texto = 'Orientação fictícia para a IA.'
                       and d.situacao = 'aprovada' and d.decidida_em is not null
                       and d.decidida_por_nome = 'Coordenação Geral')
     from evolucao.orientacoes_ia o join evolucao.dicas_ia d on d.id = o.dica_id
    where d.dica like 'Dica fictícia%');
update evolucao.dicas_ia set situacao = 'descartada', motivo = ' Motivo fictício do descarte. '
 where dica = 'Dica fictícia a descartar.';
do $$
declare
  pista text;
begin
  update evolucao.dicas_ia set situacao = 'descartada' where dica = 'Dica fictícia para a IA.';
  insert into resultado (teste, ok)
    values ('coordenação geral descarta a dica com o motivo, e a decidida não muda (E22)', false);
exception when check_violation then
  get stacked diagnostics pista = pg_exception_hint;
  insert into resultado (teste, ok)
    values ('coordenação geral descarta a dica com o motivo, e a decidida não muda (E22)',
            pista = 'dica_ja_decidida'
            and (select situacao = 'descartada' and motivo = 'Motivo fictício do descarte.'
                   from evolucao.dicas_ia where dica = 'Dica fictícia a descartar.'));
end;
$$;
update evolucao.orientacoes_ia set ativa = false where texto = 'Orientação fictícia para a IA.';
insert into resultado (teste, ok) select 'coordenação geral retira a orientação (E22)',
  (select count(*) = 1 and bool_and(not ativa and atualizado_em is not null)
     from evolucao.orientacoes_ia where texto = 'Orientação fictícia para a IA.');

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
update cadastro.termos_inadequados set substituto = 'alterado pelo coordenador'
 where termo = 'termo fictício de teste';
insert into resultado (teste, ok) select 'coordenador lê os termos inadequados e não altera (P12)',
  (select count(*) = 1 and bool_and(substituto = 'substituto fictício')
     from cadastro.termos_inadequados where termo = 'termo fictício de teste');
do $$
declare
  dica text;
  devolvida uuid;
begin
  select d.evolucao_id into devolvida from evolucao.devolucoes d where not d.resolvida;
  begin
    update evolucao.evolucoes set situacao = 'concluida' where id = devolvida;
    insert into resultado (teste, ok)
      values ('devolvida não conclui antes de o coordenador resolver (E13)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('devolvida não conclui antes de o coordenador resolver (E13)', dica = 'devolucao_aberta');
  end;
  update evolucao.devolucoes set resolvida = true where evolucao_id = devolvida;
  update evolucao.evolucoes set situacao = 'concluida' where id = devolvida;
  insert into resultado (teste, ok) select 'coordenador resolve a devolução e conclui de novo (E13)',
    (select situacao = 'concluida' from evolucao.evolucoes where id = devolvida)
    and (select count(*) = 1
                and bool_and(d.resolvida and d.resolvida_em is not null
                             and d.resolvida_por_nome = 'Coordenadora A')
           from evolucao.devolucoes d where d.evolucao_id = devolvida);
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

-- Contas médicas: antes do envio do arquivo do mês, não lê assistido nem evolução dos testes (E24).
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into resultado (teste, ok) select 'contas médicas não lê assistido nem evolução fora de arquivo',
  (select count(*) from cadastro.assistidos where nome like '%Teste') = 0
  and (select count(*) from evolucao.evolucoes where codigo like 'TST-%') = 0
  and (select count(*) from evolucao.evolucoes_do_mes('2026-11-01') where unidade_sigla = 'TST') = 0;
insert into resultado (teste, ok) select 'contas médicas não lê assinatura solta',
  (select count(*) from acesso.assinaturas
    where usuario_id = current_setting('teste.id_a')::bigint) = 0
  and (select count(*) from storage.objects
        where bucket_id = 'assinaturas' and name like current_setting('teste.id_a') || '/%') = 0;
insert into resultado (teste, ok) select 'contas médicas não lê o registro do relatório de metas (E28)',
  (select count(*) from evolucao.relatorios_de_metas) = 0;
insert into resultado (teste, ok) select 'contas médicas não recebe a prévia do Word',
  (select evolucao.conteudo_do_arquivo(c.id, date_trunc('month', now() at time zone 'America/Recife')::date) is null
     from cadastro.carteiras c join cadastro.unidades u on u.id = c.unidade_id
    where u.sigla = 'TST' and c.turno = 'tarde');
reset role;

-- Arquivo do mês (E24): vai com a carteira toda concluída, e o que foi fica só para leitura.
select set_config('teste.carteira_a',
  (select c.id::text from cadastro.carteiras c join cadastro.unidades u on u.id = c.unidade_id
    where u.sigla = 'TST' and c.turno = 'tarde'), true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
declare
  dica text;
begin
  insert into evolucao.arquivos (carteira_id) values (current_setting('teste.carteira_a')::bigint);
  insert into resultado (teste, ok) values ('arquivo do mês não vai com evolução pendente (E24)', false);
exception when check_violation then
  get stacked diagnostics dica = pg_exception_hint;
  insert into resultado (teste, ok)
    values ('arquivo do mês não vai com evolução pendente (E24)', dica = 'arquivo_com_pendencia');
end;
$$;
insert into resultado (teste, ok) select 'prévia do Word antes do envio: as concluídas, sem data de envio (E14)',
  (select c ->> 'enviado_em' is null and jsonb_array_length(c -> 'evolucoes') = 1
          and c ->> 'assinatura' like current_setting('teste.id_a') || '/%'
     from evolucao.conteudo_do_arquivo(current_setting('teste.carteira_a')::bigint, date_trunc('month', now() at time zone 'America/Recife')::date) c);
insert into resultado (teste, ok) select 'plano das metas antes do envio: o que muda no cadastro (E23)',
  (select count(*) filter (where acao = 'alcancada') = 1 and count(*) filter (where acao = 'nova') = 4
     from evolucao.plano_das_metas(current_setting('teste.carteira_a')::bigint, date_trunc('month', now() at time zone 'America/Recife')::date));
reset role;
-- Quem não teve sessão no mês sai pelo cadastro (P19): o arquivo leva só os ativos.
update cadastro.assistidos set ativo = false
 where nome in ('Assistida Um Teste', 'Assistido Tres Teste');
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into evolucao.arquivos (carteira_id) values (current_setting('teste.carteira_a')::bigint);
insert into resultado (teste, ok) select 'coordenador envia o arquivo do mês, com quem assina e a assinatura (E24)',
  (select ar.n_evolucoes = 1 and ar.coordenador_nome = 'Coordenadora A'
          and ar.coordenador_crp = '02/00001' and ar.assinatura_id is not null
          and ar.mes_ref = date_trunc('month', now() at time zone 'America/Recife')::date
     from evolucao.arquivos ar where ar.carteira_id = current_setting('teste.carteira_a')::bigint);
insert into resultado (teste, ok) select 'as evoluções do arquivo ficam enviadas na mesma data e hora',
  (select count(*) = 1 and bool_and(e.situacao = 'enviada' and e.enviada_em = ar.enviado_em)
     from evolucao.evolucoes e join evolucao.arquivos ar on ar.id = e.arquivo_id
    where ar.carteira_id = current_setting('teste.carteira_a')::bigint);
insert into resultado (teste, ok) select 'o envio atualiza o cadastro de metas: a da parte 3 fica alcançada e as da parte 4 entram (E23)',
  (select situacao = 'alcancada' from cadastro.metas where texto = 'Meta fictícia do cadastro')
  and (select count(*) = 4 and bool_and(programa is null and situacao = 'desenvolvimento'
                                        and criterio = 'Critério a definir no cadastro')
         from cadastro.metas where texto in ('Meta um', 'Meta dois', 'Meta três', 'Meta quatro'));
reset role;
insert into cadastro.assistidos (nome, genero, unidade_id, carteira_id)
  select 'Assistida Quatro Teste', 'feminino', c.unidade_id, c.id
    from cadastro.carteiras c where c.id = current_setting('teste.carteira_a')::bigint;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
declare
  dica text;
begin
  begin
    insert into evolucao.arquivos (carteira_id) values (current_setting('teste.carteira_a')::bigint);
    insert into resultado (teste, ok) values ('um arquivo por carteira e mês', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok) values ('um arquivo por carteira e mês', dica = 'arquivo_ja_enviado');
  end;
  begin
    update evolucao.evolucoes set situacao = 'em_conferencia' where arquivo_id is not null;
    insert into resultado (teste, ok) values ('evolução enviada não reabre (E13)', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok) values ('evolução enviada não reabre (E13)', dica = 'evolucao_enviada');
  end;
  begin
    insert into evolucao.evolucoes (assistido_id)
      select id from cadastro.assistidos where nome = 'Assistida Quatro Teste';
    insert into resultado (teste, ok) values ('carteira com o arquivo enviado não abre evolução no mês', false);
  exception when check_violation then
    get stacked diagnostics dica = pg_exception_hint;
    insert into resultado (teste, ok)
      values ('carteira com o arquivo enviado não abre evolução no mês', dica = 'arquivo_ja_enviado');
  end;
end;
$$;
reset role;

-- Contas médicas, depois do envio: o arquivo, as evoluções dele e os assistidos delas. Nada mais.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into resultado (teste, ok) select 'contas médicas lê o arquivo enviado, a evolução dele e o assistido dela',
  (select count(*) from evolucao.arquivos
    where carteira_id = current_setting('teste.carteira_a')::bigint) = 1
  and (select count(*) from evolucao.evolucoes where codigo like 'TST-%') = 1
  and not exists (select 1 from evolucao.evolucoes where arquivo_id is null)
  and (select count(*) from cadastro.assistidos where nome like '%Teste') = 1;
insert into resultado (teste, ok) select 'contas médicas lê só a versão final de cada parte, sem os rascunhos',
  (select count(*) = 3 and bool_and(v.conteudo ->> 'abertura' is distinct from 'Rascunho fictício.')
     from evolucao.versoes v join evolucao.evolucoes e on e.id = v.evolucao_id
    where e.codigo like 'TST-%')
  and (select count(*) from evolucao.partes) = 0;
insert into resultado (teste, ok) select 'contas médicas não lê a importação do Tita, os dias analisados nem as devoluções',
  (select count(*) from evolucao.importacoes) = 0
  and (select count(*) from evolucao.dias_analisados) = 0
  and (select count(*) from evolucao.devolucoes) = 0;
insert into resultado (teste, ok) select 'contas médicas não lê as dicas nem as orientações da IA',
  (select count(*) from evolucao.dicas_ia) = 0
  and (select count(*) from evolucao.orientacoes_ia) = 0;
insert into resultado (teste, ok) select 'contas médicas não lê os outros documentos (E25), as lacunas (E10) nem as fontes (E06)',
  (select count(*) from evolucao.documentos) = 0
  and (select count(*) from evolucao.lacunas_ignoradas) = 0
  and (select count(*) from evolucao.fontes) = 0;
insert into resultado (teste, ok) select 'contas médicas não lê o nível de apoio (E27)',
  (select count(*) from evolucao.niveis_de_apoio) = 0
  and (select count(*) from evolucao.leituras_de_nivel) = 0;
insert into resultado (teste, ok) select 'contas médicas não lê o cadastro de metas nem os termos inadequados',
  (select count(*) from cadastro.metas) = 0
  and (select count(*) from cadastro.termos_inadequados) = 0;
insert into resultado (teste, ok) select 'contas médicas lê a assinatura que foi no arquivo, e a imagem dela',
  (select count(*) from acesso.assinaturas
    where usuario_id = current_setting('teste.id_a')::bigint) = 1
  and (select count(*) from storage.objects
        where bucket_id = 'assinaturas' and name like current_setting('teste.id_a') || '/%') = 1;
insert into resultado (teste, ok) select 'conteúdo do Word: o arquivo enviado, com quem assinou e o texto final (E14)',
  (select c ->> 'coordenador' = 'Coordenadora A' and c ->> 'crp' = '02/00001'
          and c ->> 'assinatura' like current_setting('teste.id_a') || '/%'
          and c ->> 'enviado_em' is not null
          and jsonb_array_length(c -> 'evolucoes') = 1
          and c #>> '{evolucoes,0,assistido}' = 'Assistido Dois Teste'
          and c #>> '{evolucoes,0,texto,programas}' like 'Texto fictício%'
          and jsonb_array_length(c #> '{evolucoes,0,metas_do_mes}') = 4
     from evolucao.conteudo_do_arquivo(current_setting('teste.carteira_a')::bigint, date_trunc('month', now() at time zone 'America/Recife')::date) c);
insert into resultado (teste, ok) select 'lista dos arquivos do mês: o recebido, com quem enviou e as evoluções',
  (select count(*) = 1
          and bool_and(arquivo_id is not null and coordenador = 'Coordenadora A' and n_evolucoes = 1)
     from evolucao.arquivos_do_mes(date_trunc('month', now() at time zone 'America/Recife')::date)
    where unidade_sigla = 'TST')
  and (select count(*) = 1 and bool_and(assistido = 'Assistido Dois Teste' and plano is not null)
         from evolucao.evolucoes_do_arquivo((
           select id from evolucao.arquivos
            where carteira_id = current_setting('teste.carteira_a')::bigint)));
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
do $$
declare
  dica text;
begin
  insert into evolucao.devolucoes (evolucao_id, motivo)
    select e.id, 'Motivo fictício da devolução.' from evolucao.evolucoes e
     where e.arquivo_id is not null;
  insert into resultado (teste, ok) values ('evolução enviada não se devolve (E13)', false);
exception when check_violation then
  get stacked diagnostics dica = pg_exception_hint;
  insert into resultado (teste, ok)
    values ('evolução enviada não se devolve (E13)', dica = 'devolucao_so_de_concluida');
end;
$$;
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

-- Sincronização com a Tita (E28): rascunho sem carteira, ligação pelo nome e nascimento, matriz
-- ignorada, pendências e simulação que não grava nada.
insert into cadastro.unidades_da_tita (nome_na_tita, unidade_id)
  select 'INSTITUTO DO AUTISMO - TESTE', id from cadastro.unidades where sigla = 'TST';
insert into cadastro.unidades_da_tita (nome_na_tita, unidade_id)
  values ('INSTITUTO DO AUTISMO - MATRIZ TESTE', null);
insert into cadastro.assistidos (nome, genero, data_nascimento, unidade_id, carteira_id)
  select 'Manual Fulano Teste', 'masculino', date '2018-05-05', c.unidade_id, c.id
    from cadastro.carteiras c join cadastro.unidades u on u.id = c.unidade_id
   where u.sigla = 'TST' and c.turno = 'tarde';

select set_config('teste.tita', $json$[
  {"tita_id": 901, "nome": "MANUAL FULANO TESTE", "genero": "masculino", "data_nascimento": "2018-05-05",
   "data_invalida": false, "ativo": true, "unidades": ["INSTITUTO DO AUTISMO - TESTE"]},
  {"tita_id": 902, "nome": "Rascunho Novo Teste", "genero": null, "data_nascimento": "2019-01-01",
   "data_invalida": false, "ativo": true, "unidades": ["INSTITUTO DO AUTISMO - TESTE"]},
  {"tita_id": 903, "nome": "Matriz Só Teste", "genero": "feminino", "data_nascimento": "2019-02-02",
   "data_invalida": false, "ativo": true, "unidades": ["INSTITUTO DO AUTISMO - MATRIZ TESTE"]},
  {"tita_id": 904, "nome": "Unidade Nova Teste", "genero": "feminino", "data_nascimento": "2019-03-03",
   "data_invalida": false, "ativo": true, "unidades": ["INSTITUTO DO AUTISMO - NOVA TESTE"]},
  {"tita_id": 905, "nome": "Rascunho Novo Outro", "genero": "masculino", "data_nascimento": "2019-01-01",
   "data_invalida": false, "ativo": true, "unidades": ["INSTITUTO DO AUTISMO - TESTE"]},
  {"tita_id": 906, "nome": "Semsobrenome", "genero": "feminino", "data_nascimento": null,
   "data_invalida": true, "ativo": true, "unidades": ["INSTITUTO DO AUTISMO - TESTE"]}
]$json$, true);

insert into resultado (teste, ok) select 'Tita: a simulação dá os números e não grava nada',
  (select r ->> 'criados' = '2' and r ->> 'ligados' = '1' and r ->> 'ignorados' = '1'
     from (select cadastro.sincronizar_tita(current_setting('teste.tita')::jsonb, 'manual', null, true) r) s)
  and not exists (select 1 from cadastro.assistidos where nome like 'Rascunho Novo%')
  and not exists (select 1 from cadastro.assistidos_da_tita)
  and not exists (select 1 from cadastro.sincronizacoes_da_tita);

select set_config('teste.tita_resumo',
  cadastro.sincronizar_tita(current_setting('teste.tita')::jsonb, 'manual', null, false)::text, true);
insert into resultado (teste, ok) select 'Tita: cria os rascunhos, liga o cadastrado à mão e ignora a matriz',
  (select r ->> 'criados' = '2' and r ->> 'ligados' = '1' and r ->> 'ignorados' = '1'
     from (select current_setting('teste.tita_resumo')::jsonb r) s)
  and (select count(*) = 1 from cadastro.sincronizacoes_da_tita where resumo is not null);
insert into resultado (teste, ok) select 'Tita: o rascunho entra sem carteira e, com sexo Outros, sem gênero',
  (select carteira_id is null and genero is null and unidade_id = (select id from cadastro.unidades where sigla = 'TST')
     from cadastro.assistidos where nome = 'Rascunho Novo Teste');
insert into resultado (teste, ok) select 'Tita: liga pelo nome e nascimento sem trocar o nome escrito aqui',
  (select a.nome = 'Manual Fulano Teste' from cadastro.assistidos_da_tita t
     join cadastro.assistidos a on a.id = t.assistido_id where t.tita_id = 901);
insert into resultado (teste, ok) select 'Tita: o que não entra vira pendência',
  (select count(*) filter (where tipo = 'unidade_desconhecida' and detalhe = 'INSTITUTO DO AUTISMO - NOVA TESTE' and quantidade = 1) = 1
      and count(*) filter (where tipo = 'nome_incompleto' and tita_id = 906) = 1
      and count(*) filter (where tipo = 'sem_genero') = 1
      and count(*) filter (where tipo = 'possivel_duplicado') = 2
     from cadastro.pendencias_da_tita);
insert into resultado (teste, ok) select 'Tita: a segunda rodada não repete nada',
  (select r ->> 'criados' = '0' and r ->> 'ligados' = '0' and r ->> 'atualizados' = '0'
     from (select cadastro.sincronizar_tita(current_setting('teste.tita')::jsonb, 'manual', null, false) r) s)
  and (select count(*) = 5 from cadastro.pendencias_da_tita);

do $$
begin
  begin
    update cadastro.assistidos set carteira_id = null where nome = 'Manual Fulano Teste';
    insert into resultado (teste, ok) values ('Tita: quem tem carteira não volta a rascunho', false);
  exception when check_violation then
    insert into resultado (teste, ok) values ('Tita: quem tem carteira não volta a rascunho', true);
  end;
end;
$$;

insert into resultado (teste, ok) select 'Tita: só o servidor sincroniza',
  not has_function_privilege('authenticated',
    'cadastro.sincronizar_tita(jsonb, text, bigint, boolean, integer)', 'execute')
  and not has_function_privilege('authenticated', 'cadastro.conferir_agendamento_da_tita(text)', 'execute')
  and has_function_privilege('service_role',
    'cadastro.sincronizar_tita(jsonb, text, bigint, boolean, integer)', 'execute')
  and not cadastro.conferir_agendamento_da_tita(repeat('x', 40));

set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into resultado (teste, ok) select 'Tita: o coordenador não vê rascunho, pendência nem sincronização',
  not exists (select 1 from cadastro.assistidos where carteira_id is null)
  and (select count(*) from cadastro.pendencias_da_tita) = 0
  and (select count(*) from cadastro.sincronizacoes_da_tita) = 0
  and cadastro.quem_sincroniza_a_tita() is null;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into resultado (teste, ok) select 'Tita: a coordenação geral vê os rascunhos e as pendências',
  (select count(*) from cadastro.assistidos where carteira_id is null) = 2
  and (select count(*) from cadastro.pendencias_da_tita) = 5
  and cadastro.quem_sincroniza_a_tita() is not null;
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
                                      'cnpj_valido', 'evolucoes_do_usuario',
                                      'eh_contas_medicas', 'andamento_da_carteira',
                                      'versoes_enviadas', 'normalizar_nome'))));
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
