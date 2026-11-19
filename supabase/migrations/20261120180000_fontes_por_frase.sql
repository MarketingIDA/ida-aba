-- Fontes de cada frase do rascunho (E06, E25): cada frase dos 5 trechos e cada meta das partes 3 e
-- 4, como a IA escreveu, com as datas das sessões e os documentos de onde saiu. Só a versão da IA
-- tem fontes; o texto do coordenador não tem. Quem grava é a função `gerar-rascunho`, com a chave
-- de serviço, depois de descartar a data e o documento que não estavam no pedido.
--
-- Lê: quem lê a evolução, menos contas médicas (que lê só a versão final, sem os bastidores).
-- Ninguém grava pela API.

create table evolucao.fontes (
  id bigint generated always as identity primary key,
  versao_id bigint not null references evolucao.versoes (id),
  campo text not null check (campo in ('abertura', 'programas', 'comportamentos', 'recursos',
                                       'fechamento', 'metas_alcancadas', 'metas_do_mes')),
  ordem smallint not null check (ordem between 0 and 200),
  frase text not null check (length(btrim(frase)) between 1 and 5000),
  datas date[] not null default '{}',
  documentos bigint[] not null default '{}',
  unique (versao_id, campo, ordem)
);

comment on table evolucao.fontes is
  'Cada frase e cada meta do rascunho da IA, com as datas das sessões e os documentos de origem (E06).';

alter table evolucao.fontes enable row level security;
alter table evolucao.fontes force row level security;

create policy segue_a_evolucao on evolucao.fontes
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and versao_id in (
      select v.id from evolucao.versoes v where v.evolucao_id in (select e.id from evolucao.evolucoes e)
    )
  );

grant select on evolucao.fontes to authenticated;
grant all on evolucao.fontes to service_role;

-- As fontes da última versão da IA de cada parte (2, 3 e 4), com o tipo, a data e o nome de cada
-- documento, e se essa versão ainda é a atual da parte (o coordenador pode ter mudado o texto).
create function evolucao.fontes_da_evolucao(p_evolucao uuid)
returns table (
  numero smallint,
  campo text,
  ordem smallint,
  frase text,
  datas date[],
  documentos jsonb,
  versao_atual boolean,
  criado_em timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with da_ia as (
    select distinct on (v.numero) v.id, v.numero, v.criado_em
      from evolucao.versoes v
     where v.evolucao_id = p_evolucao and v.autor = 'ia' and v.numero in (2, 3, 4)
     order by v.numero, v.id desc
  ),
  atuais as (
    select distinct on (v.numero) v.id, v.numero
      from evolucao.versoes v
     where v.evolucao_id = p_evolucao
     order by v.numero, v.id desc
  )
  select ia.numero, f.campo, f.ordem, f.frase, f.datas,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', d.id, 'tipo', d.tipo, 'data', d.data_documento, 'arquivo', d.arquivo_nome)
                  order by d.id)
             from evolucao.documentos d where d.id = any (f.documentos)
         ), '[]'::jsonb),
         ia.id = a.id,
         ia.criado_em
    from da_ia ia
    join atuais a on a.numero = ia.numero
    join evolucao.fontes f on f.versao_id = ia.id
   order by ia.numero, array_position(array['abertura', 'programas', 'comportamentos', 'recursos',
                                            'fechamento', 'metas_alcancadas', 'metas_do_mes'], f.campo),
            f.ordem;
$$;

grant execute on function evolucao.fontes_da_evolucao(uuid) to authenticated, service_role;
