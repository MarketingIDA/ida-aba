-- Histórico das versões de uma parte (E07): cada versão gravada, da mais nova à mais antiga, com o
-- autor (a IA ou o coordenador), quem gravou, quando, a instrução do "gerar de novo" (E08) e o
-- conteúdo. Serve à lista de versões e ao "Comparar com o texto da IA".
--
-- Lê: quem lê a evolução (o RLS de `versoes` vale, porque a função é security invoker), menos
-- contas médicas, que lê só a versão final, sem os bastidores (como as fontes e as lacunas).
create function evolucao.historico_da_parte(p_evolucao uuid, p_numero smallint)
returns table (
  id bigint,
  autor evolucao.autor,
  instrucao text,
  criado_em timestamptz,
  criado_por text,
  conteudo jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.autor, v.instrucao, v.criado_em, u.nome, v.conteudo
    from evolucao.versoes v
    left join acesso.usuarios u on u.id = v.criado_por
   where v.evolucao_id = p_evolucao
     and v.numero = p_numero
     and not (select interno.eh_contas_medicas())
   order by v.id desc;
$$;

grant execute on function evolucao.historico_da_parte(uuid, smallint) to authenticated;
