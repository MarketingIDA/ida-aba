-- O arquivo do mês e a evolução para conferência passam a sair em PDF, no papel timbrado, no lugar
-- do Word (E14). A lista fechada das ações auditadas ganha as duas ações do PDF; as do Word ficam,
-- porque o histórico já tem registros com elas.
create or replace function evolucao.registrar_acao(p_acao text, p_registro text, p_detalhes jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  autor bigint := interno.usuario_atual_id();
begin
  if autor is null then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  if p_acao not in (
    'abriu_evolucao',        -- registro: id da evolução
    'abriu_progresso',       -- registro: id do assistido
    'abriu_metas',           -- registro: id do assistido
    'baixou_evolucao_word',  -- só no histórico: o Word deu lugar ao PDF
    'baixou_arquivo_word',   -- só no histórico: o Word deu lugar ao PDF
    'baixou_evolucao_pdf',   -- registro: id da evolução
    'baixou_arquivo_pdf'     -- registro: id do arquivo do mês ou "carteira:mês" na prévia
  ) then
    raise exception 'ação desconhecida' using errcode = '22023';
  end if;
  insert into auditoria.eventos
    (schema_nome, tabela, registro_id, operacao, usuario_id, acao, detalhes)
  values
    ('app', 'acoes', left(p_registro, 100), 'A', autor, p_acao,
     case when p_detalhes is null or jsonb_typeof(p_detalhes) <> 'object' then null
          when length(p_detalhes::text) > 2000 then null
          else p_detalhes end);
end;
$$;
