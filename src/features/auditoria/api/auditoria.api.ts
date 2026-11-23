import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/** Um evento da trilha: quem, quando, o quê e em qual registro. */
export interface Evento {
  id: number;
  ocorridoEm: string;
  usuarioId: number | null;
  usuarioNome: string | null;
  tabela: string;
  registroId: string | null;
  operacao: 'I' | 'U' | 'D' | 'A';
  acao: string | null;
  camposAlterados: string[];
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  detalhes: Record<string, unknown> | null;
  resumido: boolean;
}

export interface FiltroDaAuditoria {
  /** Datas `aaaa-mm-dd`, inclusive nas duas pontas. */
  de: string;
  ate: string;
  usuarioId: number | null;
  /** Tabela (`evolucoes`) ou ação (`entrou`). */
  tipo: string;
  registro: string;
}

export const POR_PAGINA = 50;

const objeto = z.record(z.string(), z.unknown()).nullable();

const esquemaEvento = z
  .object({
    id: z.number().int(),
    ocorrido_em: z.string(),
    usuario_id: z.number().int().nullable(),
    usuario_nome: z.string().nullable(),
    tabela: z.string(),
    registro_id: z.string().nullable(),
    operacao: z.enum(['I', 'U', 'D', 'A']),
    acao: z.string().nullable(),
    campos_alterados: z.array(z.string()).nullable(),
    dados_antes: objeto,
    dados_depois: objeto,
    detalhes: objeto,
    resumido: z.boolean(),
  })
  .transform((e): Evento => ({
    id: e.id,
    ocorridoEm: e.ocorrido_em,
    usuarioId: e.usuario_id,
    usuarioNome: e.usuario_nome,
    tabela: e.tabela,
    registroId: e.registro_id,
    operacao: e.operacao,
    acao: e.acao,
    camposAlterados: e.campos_alterados ?? [],
    antes: e.dados_antes,
    depois: e.dados_depois,
    detalhes: e.detalhes,
    resumido: e.resumido,
  }));

/** Meia-noite de Recife (UTC−3, sem horário de verão) do dia dado. */
function inicioDoDia(data: string): string {
  return `${data}T00:00:00-03:00`;
}

function diaSeguinte(data: string): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function buscarEventos(
  filtro: FiltroDaAuditoria,
  antesDe: number | null,
): Promise<Evento[]> {
  const resposta = await supabase.schema('acesso').rpc('eventos_de_auditoria', {
    p_de: filtro.de === '' ? null : inicioDoDia(filtro.de),
    p_ate: filtro.ate === '' ? null : inicioDoDia(diaSeguinte(filtro.ate)),
    p_usuario: filtro.usuarioId,
    p_tabela: filtro.tipo === '' ? null : filtro.tipo,
    p_registro: filtro.registro.trim() === '' ? null : filtro.registro.trim(),
    p_antes_de: antesDe,
    p_limite: POR_PAGINA,
  });
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível carregar a auditoria agora.',
    });
  }
  return z.array(esquemaEvento).parse(resposta.data);
}

export interface Pessoa {
  id: number;
  nome: string;
}

export async function buscarPessoas(): Promise<Pessoa[]> {
  const resposta = await supabase
    .schema('acesso')
    .from('usuarios')
    .select('id, nome')
    .order('nome');
  if (resposta.error !== null) {
    throw erroDoBanco(resposta.error, {
      indisponivel: 'Não foi possível carregar as pessoas agora.',
    });
  }
  return z.array(z.object({ id: z.number().int(), nome: z.string() })).parse(resposta.data);
}
