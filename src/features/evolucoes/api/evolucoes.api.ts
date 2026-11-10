import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';
import { type Turno, TURNOS } from '@/utils/turno';

/**
 * Única camada da feature que fala com o Supabase. Quem decide o que cada um vê é o RLS: o
 * coordenador recebe só a própria carteira; a coordenação geral, todas as unidades.
 */
export type SituacaoDaEvolucao = 'em_conferencia' | 'concluida' | 'enviada';

export interface EvolucaoDoMes {
  id: string;
  codigo: string;
  situacao: SituacaoDaEvolucao;
  origem: 'tita' | 'manual';
  partesConferidas: number;
}

/** Um assistido da carteira e a evolução dele no mês (ou `null`, ainda sem evolução). */
export interface LinhaDoMes {
  assistidoId: number;
  nome: string;
  plano: string | null;
  unidadeSigla: string;
  unidadeNome: string;
  turno: Turno;
  coordenadorId: number;
  evolucao: EvolucaoDoMes | null;
}

export interface Coordenador {
  id: number;
  nome: string;
}

const esquemaLinha = z
  .object({
    assistido_id: z.number().int(),
    nome: z.string(),
    plano: z.string().nullable(),
    unidade_sigla: z.string(),
    unidade_nome: z.string(),
    turno: z.enum(TURNOS),
    coordenador_id: z.number().int(),
    evolucao_id: z.string().nullable(),
    codigo: z.string().nullable(),
    situacao: z.enum(['em_conferencia', 'concluida', 'enviada']).nullable(),
    origem: z.enum(['tita', 'manual']).nullable(),
    partes_conferidas: z.number().int().min(0).max(4),
  })
  .transform((l): LinhaDoMes => ({
    assistidoId: l.assistido_id,
    nome: l.nome,
    plano: l.plano,
    unidadeSigla: l.unidade_sigla,
    unidadeNome: l.unidade_nome,
    turno: l.turno,
    coordenadorId: l.coordenador_id,
    evolucao:
      l.evolucao_id === null || l.codigo === null || l.situacao === null || l.origem === null
        ? null
        : {
            id: l.evolucao_id,
            codigo: l.codigo,
            situacao: l.situacao,
            origem: l.origem,
            partesConferidas: l.partes_conferidas,
          },
  }));

const esquemaCoordenador = z.object({ id: z.number().int(), nome: z.string() });

const MENSAGENS = {
  sem_permissao: 'Você não tem acesso às evoluções deste mês.',
  indisponivel: 'Não foi possível carregar as evoluções agora. Tente de novo em instantes.',
};

/** Assistidos da carteira (ou de todas, para a coordenação geral) com a evolução do mês. */
export async function buscarEvolucoesDoMes(mesRef: string): Promise<LinhaDoMes[]> {
  // Cliente sem tipos gerados: a resposta é validada pelo zod, não confiada.
  const resposta = await supabase.schema('evolucao').rpc('evolucoes_do_mes', { p_mes: mesRef });
  if (resposta.error !== null) throw erroDoBanco(resposta.error, MENSAGENS);
  return z.array(esquemaLinha).parse(resposta.data);
}

/** Coordenadores de unidade, para o filtro da coordenação geral (o RLS só deixa ela ler todos). */
export async function buscarCoordenadores(): Promise<Coordenador[]> {
  const { data, error } = await supabase
    .schema('acesso')
    .from('usuarios')
    .select('id, nome')
    .eq('papel', 'coordenador')
    .order('nome');
  if (error !== null) throw erroDoBanco(error);
  return z.array(esquemaCoordenador).parse(data);
}
