-- Termos inadequados (E10, P12): a lista de palavras que expõem o assistido, cada uma com o termo
-- técnico que a substitui. A coordenação geral mantém a lista; na evolução, o termo que aparece no
-- texto vira alerta, com a troca pelo substituto em um toque. O alerta não bloqueia a conclusão,
-- então o banco só guarda a lista: quem acha o termo no texto é a tela.
--
-- Fica em `cadastro`, como as outras listas da coordenação geral, e segue as mesmas regras: grants
-- por coluna, RLS, auditoria e nada se apaga (o termo que sai da lista fica desativado).

create table cadastro.termos_inadequados (
  id bigint generated always as identity primary key,
  termo text not null check (termo = btrim(termo) and length(termo) between 2 and 60),
  substituto text not null
    check (substituto = btrim(substituto) and length(substituto) between 2 and 120),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por bigint,
  atualizado_em timestamptz,
  atualizado_por bigint
);

-- Um termo ativo por texto, sem ligar para maiúscula, acento nem espaço a mais.
create unique index termos_inadequados_termo_idx
  on cadastro.termos_inadequados (interno.normalizar_nome(termo))
  where ativo;

comment on table cadastro.termos_inadequados is
  'Termos que expõem o assistido e o termo técnico que os substitui na evolução (E10, P12).';

create trigger colunas_padrao
  before insert or update on cadastro.termos_inadequados
  for each row execute function interno.preencher_colunas_padrao();
create trigger auditoria
  after insert or update or delete on cadastro.termos_inadequados
  for each row execute function interno.registrar_auditoria();

-- Grants por coluna, sem DELETE; quem pode o quê é o RLS.
revoke all on cadastro.termos_inadequados from public, anon, authenticated;
grant select on cadastro.termos_inadequados to authenticated;
grant insert (termo, substituto, ativo), update (termo, substituto, ativo)
  on cadastro.termos_inadequados to authenticated;
grant all on cadastro.termos_inadequados to service_role;

alter table cadastro.termos_inadequados enable row level security;
alter table cadastro.termos_inadequados force row level security;

-- Quem escreve ou acompanha a evolução lê a lista; contas médicas não precisa dela.
create policy coordenacao_le on cadastro.termos_inadequados
  for select to authenticated
  using ((select interno.usuario_ativo()) and not (select interno.eh_contas_medicas()));
create policy coordenacao_geral_insere on cadastro.termos_inadequados
  for insert to authenticated
  with check ((select interno.eh_coordenacao_geral()));
create policy coordenacao_geral_altera on cadastro.termos_inadequados
  for update to authenticated
  using ((select interno.eh_coordenacao_geral()))
  with check ((select interno.eh_coordenacao_geral()));
