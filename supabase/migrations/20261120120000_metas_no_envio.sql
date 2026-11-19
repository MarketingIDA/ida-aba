-- O cadastro de metas acompanha o envio do arquivo do mês (E23, E24) e a meta já alcançada não
-- volta às metas para o mês atual (E12).
--
-- A meta da evolução é texto (uma por linha nas partes 3 e 4), e o cadastro também: as duas se
-- encontram pelo texto normalizado, sem maiúscula, acento, espaço repetido, pontuação no fim nem
-- a marca "(manutenção)". Ao enviar:
--   parte 3, meta em desenvolvimento no cadastro          → alcançada
--   parte 3, meta já alcançada, ou a linha com "(manutenção)" → em manutenção
--   parte 3, sem meta no cadastro                         → nada muda (a tela mostra a linha)
--   parte 4, sem meta no cadastro                         → entra como meta em desenvolvimento,
--                                                           sem programa e com o critério a definir
-- A meta suspensa nunca muda. O plano é a função `evolucao.plano_das_metas`: a tela mostra o que
-- ela devolve antes da confirmação, e o envio aplica o mesmo plano, na mesma transação.
-- Recusa nova (errcode 23514): `meta_ja_alcancada`.

-- ---------------------------------------------------------------------------------------------
-- 1. A chave do texto da meta
-- ---------------------------------------------------------------------------------------------
create function interno.normalizar_meta(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(coalesce(p_texto, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '\(\s*manutencao\s*\)', '', 'g'),
    '^[[:space:]•*-]+', ''),
    '[[:space:]]+', ' ', 'g'),
    '[[:space:].;:,!]+$', ''));
$$;

grant execute on function interno.normalizar_meta(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. O plano: o que o envio muda no cadastro de metas
-- ---------------------------------------------------------------------------------------------
-- Com o login de quem pede: o coordenador vê o plano da carteira dele, e mais ninguém o de outra.
-- Entram as evoluções concluídas dos assistidos ativos da carteira no mês (as que vão no arquivo).
create function evolucao.plano_das_metas(p_carteira bigint, p_mes date)
returns table (assistido_id bigint, assistido_nome text, acao text, meta_id bigint, texto text)
language sql
stable
security invoker
set search_path = ''
as $$
  with evolucoes as (
    select e.id, e.assistido_id, a.nome
      from evolucao.evolucoes e
      join cadastro.assistidos a on a.id = e.assistido_id
     where a.carteira_id = p_carteira and a.ativo
       and e.mes_ref = p_mes and e.situacao = 'concluida'
  ),
  linhas as (
    select ev.assistido_id, ev.nome, parte.numero, btrim(l.texto) as texto,
           interno.normalizar_meta(l.texto) as chave,
           translate(lower(l.texto), 'çã', 'ca') ~ '\(\s*manutencao\s*\)' as manutencao
      from evolucoes ev
     cross join (values (3::smallint), (4::smallint)) parte (numero)
     cross join lateral (
       select v.conteudo from evolucao.versoes v
        where v.evolucao_id = ev.id and v.numero = parte.numero
        order by v.id desc limit 1
     ) versao
     cross join lateral jsonb_array_elements_text(coalesce(versao.conteudo -> 'metas', '[]'))
       as l (texto)
  ),
  casadas as (
    select l.*, m.id as meta_id, m.situacao
      from linhas l
      left join lateral (
        select m.id, m.situacao from cadastro.metas m
         where m.assistido_id = l.assistido_id and interno.normalizar_meta(m.texto) = l.chave
         order by m.situacao = 'suspensa', m.id
         limit 1
      ) m on true
     where l.chave <> ''
  ),
  acoes as (
    select c.assistido_id, c.nome, c.meta_id, c.texto, c.chave,
           case
             when c.numero = 3 and c.meta_id is null then 'nao_encontrada'
             when c.numero = 3 and c.situacao = 'desenvolvimento' and not c.manutencao then 'alcancada'
             when c.numero = 3 and c.situacao in ('desenvolvimento', 'alcancada') then 'manutencao'
             when c.numero = 4 and c.meta_id is null and length(c.texto) between 5 and 500 then 'nova'
           end as acao
      from casadas c
  )
  select distinct on (a.assistido_id, coalesce(a.meta_id::text, a.chave))
         a.assistido_id, a.nome, a.acao, a.meta_id, a.texto
    from acoes a
   where a.acao is not null
   order by a.assistido_id, coalesce(a.meta_id::text, a.chave), a.acao = 'manutencao' desc;
$$;

grant execute on function evolucao.plano_das_metas(bigint, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 3. O envio aplica o plano
-- ---------------------------------------------------------------------------------------------
-- Antes de marcar as evoluções como enviadas (o plano lê as concluídas). Tudo na transação do
-- envio: se algo falhar, nem o arquivo nem o cadastro mudam. A auditoria registra cada meta.
create or replace function interno.marcar_evolucoes_enviadas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  marcadas integer;
begin
  with plano as (
    select * from evolucao.plano_das_metas(new.carteira_id, new.mes_ref)
  ),
  atualizadas as (
    update cadastro.metas m
       set situacao = p.acao::cadastro.situacao_da_meta
      from plano p
     where p.meta_id = m.id and p.acao in ('alcancada', 'manutencao')
    returning m.id
  )
  insert into cadastro.metas (assistido_id, programa, texto, criterio, situacao)
  select p.assistido_id, null, p.texto, 'Critério a definir no cadastro', 'desenvolvimento'
    from plano p
   where p.acao = 'nova';

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

-- ---------------------------------------------------------------------------------------------
-- 4. A meta já alcançada não volta às metas para o mês atual (E12)
-- ---------------------------------------------------------------------------------------------
-- Igual à versão da devolução, mais a última verificação: nenhuma linha da parte 4 pode ser uma
-- meta alcançada ou em manutenção no cadastro, nem uma meta alcançada na parte 3 deste mês.
create or replace function interno.conferir_conclusao(p_evolucao uuid, p_assistido bigint)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  texto jsonb;
  metas jsonb;
  alcancadas jsonb;
  repetida text;
begin
  if exists (
    select 1 from evolucao.devolucoes d where d.evolucao_id = p_evolucao and not d.resolvida
  ) then
    raise exception 'A evolução foi devolvida; marque a devolução como resolvida antes de concluir.'
      using errcode = '23514', hint = 'devolucao_aberta';
  end if;
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
  select v.conteudo into alcancadas from evolucao.versoes v
   where v.evolucao_id = p_evolucao and v.numero = 3 order by v.id desc limit 1;
  select btrim(l.texto) into repetida
    from jsonb_array_elements_text(metas -> 'metas') l (texto)
   where interno.normalizar_meta(l.texto) <> ''
     and (
       exists (
         select 1 from cadastro.metas m
          where m.assistido_id = p_assistido and m.situacao in ('alcancada', 'manutencao')
            and interno.normalizar_meta(m.texto) = interno.normalizar_meta(l.texto)
       )
       or interno.normalizar_meta(l.texto) in (
         select interno.normalizar_meta(a.texto)
           from jsonb_array_elements_text(coalesce(alcancadas -> 'metas', '[]')) a (texto)
       )
     )
   limit 1;
  if repetida is not null then
    raise exception 'A meta "%" já foi alcançada; tire-a das metas para o mês atual.', left(repetida, 120)
      using errcode = '23514', hint = 'meta_ja_alcancada';
  end if;
end;
$$;
