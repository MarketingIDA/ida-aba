-- Lacunas da evolução mensal (E10, E26). Uma lacuna é um programa do plano terapêutico (meta em
-- desenvolvimento com programa no cadastro) que não aparece nas análises do período. O rascunho
-- não inventa texto sobre ele; o coordenador resolve a lacuna de um destes jeitos:
--   não foi trabalhado → entra no texto a frase de que o programa não foi aplicado no período;
--   foi trabalhado     → o coordenador escreve, e a lacuna se resolve quando o texto cita o programa;
--   ignorar            → nada entra no texto; fica registrado quem ignorou e quando.
-- Lacuna aberta bloqueia a conclusão (errcode 23514, hint `lacuna_aberta`).
--
-- "Aparece nas análises": com o nível de apoio lido (E27), quando alguma meta do programa tem
-- linha em `evolucao.niveis_de_apoio` nesta evolução, a mesma leitura do gráfico; sem a leitura
-- (ainda não lida, falhou ou sem o PDF do Tita), quando o nome do programa está no texto das
-- análises do período. Na evolução escrita à mão não há análises: vale só o texto (E26).
-- O nome do programa e o texto se comparam normalizados (`interno.normalizar_meta`).

-- ---------------------------------------------------------------------------------------------
-- 1. Quem ignorou cada lacuna
-- ---------------------------------------------------------------------------------------------
create table evolucao.lacunas_ignoradas (
  evolucao_id uuid not null references evolucao.evolucoes (id),
  chave text not null, -- o programa normalizado
  programa text not null check (length(btrim(programa)) between 1 and 200),
  ignorada_por bigint not null references acesso.usuarios (id),
  ignorada_por_nome text not null,
  ignorada_em timestamptz not null default now(),
  primary key (evolucao_id, chave)
);

create index lacunas_ignoradas_ignorada_por_idx on evolucao.lacunas_ignoradas (ignorada_por);

comment on table evolucao.lacunas_ignoradas is
  'Lacunas da evolução mensal que o coordenador ignorou, com quem e quando (E10).';

create function interno.ignorar_lacuna()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu bigint := interno.usuario_atual_id();
begin
  if eu is null then
    raise exception 'Sem usuário ativo.' using errcode = '42501';
  end if;
  perform interno.exigir_em_conferencia(new.evolucao_id);
  new.programa := btrim(new.programa);
  new.chave := interno.normalizar_meta(new.programa);
  new.ignorada_por := eu;
  select u.nome into new.ignorada_por_nome from acesso.usuarios u where u.id = eu;
  new.ignorada_em := now();
  return new;
end;
$$;

create trigger ignorar_lacuna
  before insert on evolucao.lacunas_ignoradas
  for each row execute function interno.ignorar_lacuna();

revoke all on function interno.ignorar_lacuna() from public, anon, authenticated;

alter table evolucao.lacunas_ignoradas enable row level security;
alter table evolucao.lacunas_ignoradas force row level security;

-- Lê: quem lê a evolução, menos contas médicas. Grava: o coordenador da carteira.
create policy segue_a_evolucao on evolucao.lacunas_ignoradas
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
create policy coordenador_ignora on evolucao.lacunas_ignoradas
  for insert to authenticated
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));

grant select, insert (evolucao_id, programa) on evolucao.lacunas_ignoradas to authenticated;
grant all on evolucao.lacunas_ignoradas to service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. As lacunas de uma evolução
-- ---------------------------------------------------------------------------------------------
-- Com o login de quem pede. Uma linha por programa que não aparece nas análises:
--   situacao 'resolvida' (o texto da evolução mensal cita o programa), 'ignorada' ou 'aberta'.
-- `metas` são as metas em desenvolvimento do programa, para o alerta da parte 4 (E12).
create function evolucao.lacunas(p_evolucao uuid)
returns table (
  programa text,
  situacao text,
  metas text[],
  ignorada_por text,
  ignorada_em timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with ev as (
    select e.id, e.assistido_id, e.mes_ref from evolucao.evolucoes e where e.id = p_evolucao
  ),
  programas as (
    select interno.normalizar_meta(m.programa) as chave, min(btrim(m.programa)) as programa,
           array_agg(m.texto order by m.id) as metas
      from cadastro.metas m
      join ev on ev.assistido_id = m.assistido_id
     where m.situacao = 'desenvolvimento' and interno.normalizar_meta(m.programa) <> ''
     group by 1
  ),
  lida as (
    select exists (
      select 1 from evolucao.leituras_de_nivel l
       where l.evolucao_id = p_evolucao and l.situacao = 'lida'
    ) as sim
  ),
  analises as (
    select ' ' || coalesce(interno.normalizar_meta(string_agg(a ->> 'texto', ' ')), '') || ' ' as texto
      from ev
      cross join lateral (
        select i.analises from evolucao.importacoes i
         where i.evolucao_id = ev.id order by i.id desc limit 1
      ) imp
      cross join lateral jsonb_array_elements(imp.analises) a
     where (a ->> 'data')::date >= (ev.mes_ref - interval '1 month')::date
       and (a ->> 'data')::date < ev.mes_ref
  ),
  texto as (
    select ' ' || interno.normalizar_meta(concat_ws(' ',
             v.conteudo ->> 'abertura', v.conteudo ->> 'programas', v.conteudo ->> 'comportamentos',
             v.conteudo ->> 'recursos', v.conteudo ->> 'fechamento')) || ' ' as texto
      from evolucao.versoes v
     where v.evolucao_id = p_evolucao and v.numero = 2
     order by v.id desc
     limit 1
  ),
  ausentes as (
    select p.*
      from programas p
     where case
             when (select sim from lida) then not exists (
               select 1 from evolucao.niveis_de_apoio n
                 join cadastro.metas m on m.id = n.meta_id
                where n.evolucao_id = p_evolucao
                  and interno.normalizar_meta(m.programa) = p.chave
             )
             else position(p.chave in coalesce((select texto from analises), '')) = 0
           end
  )
  select a.programa,
         case
           when position(a.chave in coalesce((select texto from texto), '')) > 0 then 'resolvida'
           when li.chave is not null then 'ignorada'
           else 'aberta'
         end,
         a.metas,
         li.ignorada_por_nome,
         li.ignorada_em
    from ausentes a
    left join evolucao.lacunas_ignoradas li
      on li.evolucao_id = p_evolucao and li.chave = a.chave
   order by a.programa;
$$;

grant execute on function evolucao.lacunas(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 3. Lacuna aberta bloqueia a conclusão
-- ---------------------------------------------------------------------------------------------
-- Igual à versão de 20261120120000_metas_no_envio.sql, mais a lacuna aberta, depois do texto.
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
  lacuna text;
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
  select l.programa into lacuna from evolucao.lacunas(p_evolucao) l where l.situacao = 'aberta' limit 1;
  if lacuna is not null then
    raise exception 'O programa "%" não aparece nas análises; resolva a lacuna na evolução mensal.', left(lacuna, 120)
      using errcode = '23514', hint = 'lacuna_aberta';
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
