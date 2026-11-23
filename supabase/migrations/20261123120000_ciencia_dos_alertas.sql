-- Ciência dos alertas da importação do Tita (E19, P16): os alertas da leitura (período maior,
-- total diferente, datas fora do período, data citada diferente) seguem nas conferências da
-- evolução até o coordenador dar ciência. A ciência é da importação: importar de novo traz
-- alertas novos, sem ciência. Não bloqueia a conclusão; fica registrado quem deu e quando.

create table evolucao.ciencias_da_importacao (
  importacao_id bigint primary key references evolucao.importacoes (id),
  evolucao_id uuid not null references evolucao.evolucoes (id),
  dada_por bigint not null references acesso.usuarios (id),
  dada_por_nome text not null,
  dada_em timestamptz not null default now()
);

create index ciencias_da_importacao_evolucao_idx on evolucao.ciencias_da_importacao (evolucao_id);
create index ciencias_da_importacao_dada_por_idx on evolucao.ciencias_da_importacao (dada_por);

comment on table evolucao.ciencias_da_importacao is
  'Ciência dos alertas de cada importação do PDF do Tita, com quem e quando (E19, P16).';

-- O cliente manda só a importação; a evolução, quem e quando são do banco.
create function interno.dar_ciencia()
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
  select i.evolucao_id into new.evolucao_id
    from evolucao.importacoes i where i.id = new.importacao_id;
  perform interno.exigir_em_conferencia(new.evolucao_id);
  new.dada_por := eu;
  select u.nome into new.dada_por_nome from acesso.usuarios u where u.id = eu;
  new.dada_em := now();
  return new;
end;
$$;

create trigger dar_ciencia
  before insert on evolucao.ciencias_da_importacao
  for each row execute function interno.dar_ciencia();

revoke all on function interno.dar_ciencia() from public, anon, authenticated;

alter table evolucao.ciencias_da_importacao enable row level security;
alter table evolucao.ciencias_da_importacao force row level security;

-- Lê: quem lê a evolução, menos contas médicas. Grava: o coordenador da carteira.
create policy segue_a_evolucao on evolucao.ciencias_da_importacao
  for select to authenticated
  using (
    not (select interno.eh_contas_medicas())
    and evolucao_id in (select e.id from evolucao.evolucoes e)
  );
create policy coordenador_da_ciencia on evolucao.ciencias_da_importacao
  for insert to authenticated
  with check (evolucao_id in (select interno.evolucoes_do_usuario()));

revoke all on evolucao.ciencias_da_importacao from public, anon, authenticated;
grant select, insert (importacao_id) on evolucao.ciencias_da_importacao to authenticated;
grant all on evolucao.ciencias_da_importacao to service_role;
