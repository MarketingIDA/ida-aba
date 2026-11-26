-- O Tita escreve a terapia como "ABA" ou "Terapia ABA" (às vezes com ponto no fim). A recusa
-- "O PDF não é da terapia ABA" só aceitava "ABA" e barrava relatórios que são da terapia ABA.
-- Agora: o filtro diz ABA (com ou sem "Terapia"); sem filtro de terapia ("Todas" ou ausente),
-- vale se o favorecido só tem ABA. A tela confere do mesmo jeito (tita/leitura.ts).

create function interno.do_tita_da_terapia_aba(p_favorecido jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with v as (
    select interno.normalizar_nome(coalesce(p_favorecido ->> 'filtro_terapia', '')) as filtro,
           interno.normalizar_nome(coalesce(p_favorecido ->> 'terapias', '')) as terapias
  )
  select regexp_replace(
           regexp_replace(case when filtro in ('', 'todas') then terapias else filtro end,
                          '\.$', ''),
           '^terapia ', '') = 'aba'
    from v;
$$;

create or replace function interno.gravar_importacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
begin
  perform interno.exigir_em_conferencia(new.evolucao_id);
  if not interno.leitura_do_tita_valida(new.favorecido, new.analises) then
    raise exception 'A leitura do PDF não segue o formato esperado.'
      using errcode = '23514', hint = 'tita_leitura_invalida';
  end if;

  select a.nome, e.periodo_inicio, e.periodo_fim into ev
    from evolucao.evolucoes e
    join cadastro.assistidos a on a.id = e.assistido_id
   where e.id = new.evolucao_id;
  if interno.normalizar_nome(new.favorecido ->> 'nome') <> interno.normalizar_nome(ev.nome) then
    raise exception 'O PDF é de outro favorecido, não do assistido desta evolução.'
      using errcode = '23514', hint = 'tita_outro_assistido';
  end if;
  if (new.favorecido ->> 'periodo_inicio')::date > ev.periodo_inicio
     or (new.favorecido ->> 'periodo_fim')::date < ev.periodo_fim then
    raise exception 'O período avaliado do PDF não cobre o período analisado inteiro.'
      using errcode = '23514', hint = 'tita_periodo_incompleto';
  end if;
  if not interno.do_tita_da_terapia_aba(new.favorecido) then
    raise exception 'O PDF não é da terapia ABA.'
      using errcode = '23514', hint = 'tita_outra_terapia';
  end if;
  if interno.normalizar_nome(coalesce(new.favorecido ->> 'filtro_profissional', '')) <> 'todos' then
    raise exception 'O PDF foi exportado com filtro de profissional.'
      using errcode = '23514', hint = 'tita_filtro_de_profissional';
  end if;

  new.criado_em := now();
  new.criado_por := interno.usuario_atual_id();
  return new;
end;
$$;
