-- Cadastro de metas por assistido (E23): o plano terapêutico. Cada meta tem o programa, o texto, o
-- critério de alcance e a situação: em desenvolvimento, alcançada, em manutenção ou suspensa.
--
-- O coordenador mantém as metas dos assistidos da carteira dele; a coordenação geral lê todas;
-- contas médicas não lê. Nada se apaga: a meta que sai de cena fica suspensa ou alcançada. Cada
-- mudança fica na auditoria, como no resto do cadastro.
--
-- As metas em desenvolvimento são o ponto de partida das metas para o mês atual da evolução. A
-- atualização do cadastro no envio do arquivo do mês entra numa etapa própria.

create type cadastro.situacao_da_meta as enum ('desenvolvimento', 'alcancada', 'manutencao', 'suspensa');

create table cadastro.metas (
  id bigint generated always as identity primary key,
  assistido_id bigint not null references cadastro.assistidos (id),
  programa text check (programa is null or length(btrim(programa)) between 2 and 80),
  texto text not null check (length(btrim(texto)) between 5 and 500), -- o limite da meta na evolução
  criterio text not null check (length(btrim(criterio)) between 3 and 300),
  situacao cadastro.situacao_da_meta not null default 'desenvolvimento',
  situacao_em timestamptz not null default now(), -- quando a situação mudou pela última vez
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint
);

create index metas_assistido_idx on cadastro.metas (assistido_id, situacao);

comment on table cadastro.metas is
  'Plano terapêutico de cada assistido (E23): metas por programa, com critério e situação.';

-- A meta não muda de assistido, e a data da situação é do banco.
create function interno.guardar_meta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.situacao_em := now();
    return new;
  end if;
  new.assistido_id := old.assistido_id;
  new.situacao_em := case when new.situacao = old.situacao then old.situacao_em else now() end;
  return new;
end;
$$;

revoke all on function interno.guardar_meta() from public, anon, authenticated;

create trigger guardar_meta
  before insert or update on cadastro.metas
  for each row execute function interno.guardar_meta();
create trigger colunas_padrao
  before insert or update on cadastro.metas
  for each row execute function interno.preencher_colunas_padrao();
create trigger auditoria
  after insert or update or delete on cadastro.metas
  for each row execute function interno.registrar_auditoria();

-- Grants por coluna, sem DELETE; quem pode o quê é o RLS.
revoke all on cadastro.metas from public, anon, authenticated;
grant select on cadastro.metas to authenticated;
grant insert (assistido_id, programa, texto, criterio, situacao),
      update (programa, texto, criterio, situacao)
  on cadastro.metas to authenticated;
grant all on cadastro.metas to service_role;

alter table cadastro.metas enable row level security;
alter table cadastro.metas force row level security;

create policy carteira_ou_coordenacao_geral_le on cadastro.metas
  for select to authenticated
  using (
    (select interno.eh_coordenacao_geral())
    or assistido_id in (select interno.assistidos_do_usuario())
  );
create policy coordenador_cadastra on cadastro.metas
  for insert to authenticated
  with check (assistido_id in (select interno.assistidos_do_usuario()));
create policy coordenador_altera on cadastro.metas
  for update to authenticated
  using (assistido_id in (select interno.assistidos_do_usuario()))
  with check (assistido_id in (select interno.assistidos_do_usuario()));

-- A evolução inteira passa a dizer de qual assistido é, para a tela buscar as metas do cadastro.
create or replace function evolucao.evolucao_completa(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'codigo', e.codigo, 'mes_ref', e.mes_ref, 'situacao', e.situacao,
    'origem', e.origem, 'concluida_em', e.concluida_em,
    'periodo_inicio', e.periodo_inicio, 'periodo_fim', e.periodo_fim,
    'assistido_id', e.assistido_id,
    'assistido', a.nome, 'plano', p.nome, 'unidade', u.nome, 'turno', c.turno,
    'coordenador', co.nome,
    'editavel', e.assistido_id in (select interno.assistidos_do_usuario()),
    'partes', (
      select jsonb_agg(jsonb_build_object(
               'numero', pt.numero, 'conferida_em', pt.conferida_em, 'conferida_por', pu.nome)
             order by pt.numero)
        from evolucao.partes pt
        left join acesso.usuarios pu on pu.id = pt.conferida_por
       where pt.evolucao_id = e.id),
    'versoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'numero', v.numero, 'conteudo', v.conteudo, 'autor', v.autor,
               'criado_em', v.criado_em, 'criado_por', v.nome))
        from (
          select distinct on (vs.numero) vs.numero, vs.conteudo, vs.autor, vs.criado_em, vu.nome
            from evolucao.versoes vs
            left join acesso.usuarios vu on vu.id = vs.criado_por
           where vs.evolucao_id = e.id
           order by vs.numero, vs.id desc
        ) v), '[]'::jsonb)
  )
    from evolucao.evolucoes e
    join cadastro.assistidos a on a.id = e.assistido_id
    join cadastro.unidades u on u.id = a.unidade_id
    join cadastro.carteiras c on c.id = a.carteira_id
    left join cadastro.planos p on p.id = a.plano_id
    left join acesso.usuarios co on co.id = c.coordenador_id
   where e.id = p_id;
$$;
