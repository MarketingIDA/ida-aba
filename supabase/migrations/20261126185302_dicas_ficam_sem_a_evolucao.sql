-- A dica para a IA vale além da evolução onde nasceu: apagada a evolução, a dica e a orientação
-- ficam, sem a ligação. Quem dá a dica continua precisando de uma evolução da carteira (o RLS
-- `coordenador_sugere` recusa evolucao_id nulo). Idempotente.
alter table evolucao.dicas_ia alter column evolucao_id drop not null;
alter table evolucao.dicas_ia drop constraint if exists dicas_ia_evolucao_id_fkey;
alter table evolucao.dicas_ia
  add constraint dicas_ia_evolucao_id_fkey
  foreign key (evolucao_id) references evolucao.evolucoes (id) on delete set null;
