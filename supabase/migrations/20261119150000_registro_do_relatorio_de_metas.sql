-- Registro do relatório de metas (E28): cada download, envio e link copiado do relatório da
-- evolução das metas fica gravado com quem fez e quando. O PDF é montado no navegador, com os
-- mesmos números da tela (como o Word do arquivo do mês); o registro vem antes de o arquivo ser
-- entregue, e quem baixa não escolhe quem fez nem quando: o trigger preenche.
--
-- A tabela fica no schema `evolucao`, que a API já expõe, e não em `auditoria`, que só a
-- coordenação geral lê e que a API não expõe: o coordenador precisa ler o registro do assistido
-- dele na janela de compartilhar.
--
-- Lê e grava: o coordenador, os assistidos da carteira dele; a coordenação geral, todos.
-- Contas médicas não lê nem grava. Ninguém altera nem apaga.

create table evolucao.relatorios_de_metas (
  id bigint generated always as identity primary key,
  assistido_id bigint not null references cadastro.assistidos (id),
  acao text not null check (acao in ('baixou', 'enviou', 'baixou_para_enviar', 'copiou_link')),
  feito_por bigint not null references acesso.usuarios (id),
  feito_por_nome text not null, -- o coordenador não lê a linha de outro usuário
  feito_em timestamptz not null default now()
);

create index relatorios_de_metas_assistido_idx on evolucao.relatorios_de_metas (assistido_id, feito_em);
create index relatorios_de_metas_feito_por_idx on evolucao.relatorios_de_metas (feito_por);

comment on table evolucao.relatorios_de_metas is
  'Quem baixou, enviou ou copiou o link do relatório de metas, e quando (E28).';

create function interno.registrar_relatorio_de_metas()
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
  new.feito_por := eu;
  select u.nome into new.feito_por_nome from acesso.usuarios u where u.id = eu;
  new.feito_em := now();
  return new;
end;
$$;

create trigger registrar_relatorio_de_metas
  before insert on evolucao.relatorios_de_metas
  for each row execute function interno.registrar_relatorio_de_metas();

revoke all on function interno.registrar_relatorio_de_metas() from public, anon, authenticated;

alter table evolucao.relatorios_de_metas enable row level security;
alter table evolucao.relatorios_de_metas force row level security;

create policy carteira_ou_coordenacao_geral_le on evolucao.relatorios_de_metas
  for select to authenticated
  using (
    (select interno.eh_coordenacao_geral())
    or assistido_id in (select interno.assistidos_do_usuario())
  );
create policy carteira_ou_coordenacao_geral_registra on evolucao.relatorios_de_metas
  for insert to authenticated
  with check (
    (select interno.usuario_ativo())
    and (
      (select interno.eh_coordenacao_geral())
      or assistido_id in (select interno.assistidos_do_usuario())
    )
  );

grant select, insert (assistido_id, acao) on evolucao.relatorios_de_metas to authenticated;
grant all on evolucao.relatorios_de_metas to service_role;
