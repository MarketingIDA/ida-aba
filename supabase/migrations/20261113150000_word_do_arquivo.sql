-- Word do arquivo do mês (E14): o que o documento leva e quem pode ler.
--
-- O Word é montado no navegador de quem baixa, com o que o RLS deixa ler. Esta migração entrega o
-- conteúdo numa chamada só e abre a contas médicas o que o Word do arquivo enviado contém:
--   a versão final de cada parte das evoluções enviadas (os rascunhos seguem fechados);
--   a assinatura que foi no arquivo, na tabela e no Storage.
-- A assinatura do arquivo passa a ser lida por quem lê o arquivo: contas médicas, a coordenação
-- geral e quem coordena a carteira hoje, mesmo que outra pessoa tenha enviado.
--
-- Antes do envio, o coordenador baixa a prévia com as evoluções já concluídas da carteira.

-- ---------------------------------------------------------------------------------------------
-- 1. Contas médicas lê a versão final das evoluções enviadas
-- ---------------------------------------------------------------------------------------------
-- A versão final de cada parte é a de maior `id`; a evolução enviada não ganha versão nova (E13).
-- Função à parte porque a policy de `versoes` não pode consultar a própria tabela.
create function interno.versoes_enviadas()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (v.evolucao_id, v.numero) v.id
    from evolucao.versoes v
    join evolucao.evolucoes e on e.id = v.evolucao_id
   where e.arquivo_id is not null
   order by v.evolucao_id, v.numero, v.id desc;
$$;

revoke all on function interno.versoes_enviadas() from public, anon, authenticated;
grant execute on function interno.versoes_enviadas() to authenticated, service_role;

create policy contas_medicas_le_a_versao_final on evolucao.versoes
  for select to authenticated
  using ((select interno.eh_contas_medicas()) and id in (select interno.versoes_enviadas()));

-- ---------------------------------------------------------------------------------------------
-- 2. Quem lê o arquivo lê a assinatura que foi nele
-- ---------------------------------------------------------------------------------------------
-- O RLS de `evolucao.arquivos` vale dentro das subconsultas: cada um só alcança a assinatura dos
-- arquivos que já lê.
create policy quem_le_o_arquivo_le_a_assinatura_dele on acesso.assinaturas
  for select to authenticated
  using (id in (select ar.assinatura_id from evolucao.arquivos ar));

create policy assinatura_de_arquivo_enviado_le on storage.objects
  for select to authenticated
  using (
    bucket_id = 'assinaturas'
    and name in (
      select s.caminho from acesso.assinaturas s
       where s.id in (select ar.assinatura_id from evolucao.arquivos ar)
    )
  );

-- ---------------------------------------------------------------------------------------------
-- 3. O conteúdo do Word
-- ---------------------------------------------------------------------------------------------
-- O arquivo enviado: as evoluções que ele levou, com quem assinou e a assinatura da época. Sem
-- arquivo, a prévia: as evoluções concluídas dos assistidos ativos da carteira, com o coordenador
-- e a assinatura de hoje. A identificação vem do cadastro atual, como na tela da evolução.
-- security invoker: o RLS vale para quem chama. Contas médicas só recebe o arquivo enviado; o
-- coordenador, o das carteiras dele e os que ele já lê; quem não pode recebe `null`.
create function evolucao.conteudo_do_arquivo(p_carteira bigint, p_mes date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'unidade', u.nome, 'unidade_sigla', u.sigla, 'turno', c.turno, 'mes_ref', p_mes,
    'enviado_em', ar.enviado_em,
    'coordenador', coalesce(ar.coordenador_nome, co.nome),
    'crp', case when ar.id is null then co.crp else ar.coordenador_crp end,
    'assinatura', (
      select s.caminho from acesso.assinaturas s
       where case when ar.id is null then s.usuario_id = c.coordenador_id
                  else s.id = ar.assinatura_id end
       order by s.id desc limit 1),
    'evolucoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'codigo', e.codigo, 'assistido', a.nome, 'plano', p.nome,
               'texto', (
                 select v.conteudo from evolucao.versoes v
                  where v.evolucao_id = e.id and v.numero = 2 order by v.id desc limit 1),
               'metas_alcancadas', (
                 select v.conteudo -> 'metas' from evolucao.versoes v
                  where v.evolucao_id = e.id and v.numero = 3 order by v.id desc limit 1),
               'metas_do_mes', (
                 select v.conteudo -> 'metas' from evolucao.versoes v
                  where v.evolucao_id = e.id and v.numero = 4 order by v.id desc limit 1))
             order by a.nome)
        from evolucao.evolucoes e
        join cadastro.assistidos a on a.id = e.assistido_id
        left join cadastro.planos p on p.id = a.plano_id
       where e.mes_ref = p_mes
         and case when ar.id is null
                  then e.situacao = 'concluida' and a.carteira_id = c.id and a.ativo
                  else e.arquivo_id = ar.id end), '[]'::jsonb)
  )
    from cadastro.carteiras c
    join cadastro.unidades u on u.id = c.unidade_id
    left join acesso.usuarios co on co.id = c.coordenador_id
    left join evolucao.arquivos ar on ar.carteira_id = c.id and ar.mes_ref = p_mes
   where c.id = p_carteira
     and (ar.id is not null
          or (select interno.eh_coordenacao_geral())
          or c.id in (select interno.carteiras_do_usuario()));
$$;

revoke all on function evolucao.conteudo_do_arquivo(bigint, date) from public, anon;
grant execute on function evolucao.conteudo_do_arquivo(bigint, date) to authenticated, service_role;
