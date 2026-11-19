-- Mediana da carteira (E27): na evolução das metas em gráfico, a linha do assistido vem diante da
-- mediana dos assistidos da mesma carteira, semana a semana. A mediana é calculada no navegador,
-- pelo mesmo domínio puro que calcula a linha do assistido; o banco só entrega, de cada assistido
-- da carteira, o dia em que cada meta chegou à independência dentro da janela.
--
-- O que sai daqui não identifica ninguém: um número de ordem por assistido e as datas. Não sai
-- nome, meta, nível nem trecho. A função roda com o login de quem pede (security invoker): o
-- coordenador só alcança a própria carteira, a coordenação geral alcança todas e contas médicas
-- não lê nada, pelo RLS das tabelas de sempre.
--
-- Entra na mediana só o assistido com algum mês lido na janela: um mês sem os níveis lidos não é
-- um mês sem trabalho, e contar zeros de quem ainda não foi lido puxaria a mediana para baixo.
-- O assistido lido sem meta independente vem numa linha com a data nula: conta como zero.

create function evolucao.independencia_da_carteira(
  p_assistido_id bigint,
  p_inicio date,
  p_fim date
)
returns table (assistido integer, independente_em date)
language sql
stable
security invoker
set search_path = ''
as $$
  with carteira as (
    select a.carteira_id from cadastro.assistidos a where a.id = p_assistido_id
  ),
  lidos as (
    select distinct a.id
      from cadastro.assistidos a
      join carteira c on c.carteira_id = a.carteira_id
      join evolucao.evolucoes e on e.assistido_id = a.id
      join evolucao.leituras_de_nivel l on l.evolucao_id = e.id and l.situacao = 'lida'
     where (a.ativo or a.id = p_assistido_id)
       and e.periodo_fim >= p_inicio
       and e.periodo_inicio <= p_fim
  ),
  numerados as (
    select l.id, (row_number() over (order by l.id))::integer as n from lidos l
  )
  select n.n, i.primeira
    from numerados n
    left join lateral (
      select min(v.data) as primeira
        from cadastro.metas m
        join evolucao.niveis_de_apoio v on v.meta_id = m.id
       where m.assistido_id = n.id
         and m.programa is not null
         and m.situacao <> 'suspensa'
         and v.nivel = 5
         and v.data between p_inicio and p_fim
       group by m.id
    ) i on true
   order by n.n, i.primeira;
$$;

comment on function evolucao.independencia_da_carteira(bigint, date, date) is
  'Dia em que cada meta dos assistidos lidos da carteira chegou à independência, sem identificar ninguém (E27).';

revoke all on function evolucao.independencia_da_carteira(bigint, date, date) from public, anon;
grant execute on function evolucao.independencia_da_carteira(bigint, date, date)
  to authenticated, service_role;
