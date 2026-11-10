-- O CNPJ passa a valer para todas as unidades, também as de antes da obrigação.
--
-- Em 20261110160000_cnpj_da_unidade a obrigação entrou `not valid`, porque as unidades de
-- produção ainda não tinham CNPJ. Agora todas têm: o check confere as linhas antigas e a coluna
-- vira `not null`. Com o check já validado, o `set not null` não relê a tabela; depois o check
-- sobra e sai.
alter table cadastro.unidades validate constraint unidades_cnpj_obrigatorio;
alter table cadastro.unidades alter column cnpj set not null;
alter table cadastro.unidades drop constraint unidades_cnpj_obrigatorio;
