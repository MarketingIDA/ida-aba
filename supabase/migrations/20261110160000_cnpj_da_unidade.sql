-- CNPJ (obrigatório) e endereço (opcional) da unidade.
--
-- O CNPJ fica sem pontuação: 12 caracteres (números, ou letras maiúsculas no CNPJ alfanumérico
-- da Receita, emitido desde julho de 2026) e 2 dígitos verificadores. A tela formata e confere o
-- mesmo cálculo; o banco tem a última palavra.
--
-- As unidades que já existem não têm CNPJ, e ele não pode vir de outro lugar além da tela. Por
-- isso a obrigação entra como `not valid`: vale para toda unidade nova e para toda alteração, mas
-- não confere as linhas antigas. Depois que todas tiverem o CNPJ, outra migração faz o
-- `validate constraint`.
--
-- Não há `unique`: mais de uma unidade pode responder pelo mesmo CNPJ.

-- ---------------------------------------------------------------------------------------------
-- 1. O cálculo dos dígitos verificadores
-- ---------------------------------------------------------------------------------------------
-- Cada caractere vale o código ASCII menos 48 (0 a 9 para os números, 17 a 42 para A a Z). Os
-- pesos e o módulo 11 são os do CNPJ numérico, que continua válido do mesmo jeito.
create function interno.cnpj_valido(cnpj text)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  pesos constant int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma int;
  resto int;
begin
  if cnpj !~ '^[0-9A-Z]{12}[0-9]{2}$' or ltrim(cnpj, left(cnpj, 1)) = '' then
    return false;
  end if;
  for posicao in 13 .. 14 loop
    soma := 0;
    for i in 1 .. posicao - 1 loop
      soma := soma + (ascii(substr(cnpj, i, 1)) - 48) * pesos[i + 14 - posicao];
    end loop;
    resto := soma % 11;
    if (case when resto < 2 then 0 else 11 - resto end) <> ascii(substr(cnpj, posicao, 1)) - 48 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- O `check` roda com o papel de quem grava: `authenticated` precisa executar. A função só calcula,
-- não lê tabela nenhuma, e `interno` não é exposto na Data API.
revoke all on function interno.cnpj_valido(text) from public, anon, authenticated;
grant execute on function interno.cnpj_valido(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. As colunas
-- ---------------------------------------------------------------------------------------------
alter table cadastro.unidades
  add column cnpj text constraint unidades_cnpj_valido check (interno.cnpj_valido(cnpj)),
  add column endereco text
    constraint unidades_endereco_tamanho check (length(btrim(endereco)) between 5 and 200);

alter table cadastro.unidades
  add constraint unidades_cnpj_obrigatorio check (cnpj is not null) not valid;

-- Grants por coluna: a coordenação geral (pelo RLS) grava as duas.
grant insert (sigla, nome, ativa, cnpj, endereco), update (sigla, nome, ativa, cnpj, endereco)
  on cadastro.unidades to authenticated;
