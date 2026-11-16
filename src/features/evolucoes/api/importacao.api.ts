import { z } from 'zod';

import type { AnaliseLida, Favorecido, Leitura } from '@/features/evolucoes/tita/leitura';
import { erroDoBanco, type MensagensDoBanco } from '@/lib/erroDoBanco';
import { supabase } from '@/lib/supabase';

/**
 * A importação do PDF do Tita de uma evolução (E02): o que foi lido fica em
 * `evolucao.importacoes`; o PDF não é guardado. Importar de novo grava outra linha, e a atual é a
 * última. Quem pode o quê e o que é recusado são do banco; aqui só se traduzem as recusas.
 */
export interface Importacao {
  arquivo: string;
  importadoEm: string;
  favorecido: Favorecido;
  analises: AnaliseLida[];
}

const esquemaFavorecido = z
  .object({
    nome: z.string(),
    idade: z.string().default(''),
    genero: z.string().default(''),
    terapias: z.string().default(''),
    profissionais: z.string().default(''),
    periodo_inicio: z.string(),
    periodo_fim: z.string(),
    filtro_profissional: z.string().default(''),
    filtro_terapia: z.string().default(''),
    total: z.number().int().nullable().default(null),
  })
  .transform((f): Favorecido => ({
    nome: f.nome,
    idade: f.idade,
    genero: f.genero,
    terapias: f.terapias,
    profissionais: f.profissionais,
    periodoInicio: f.periodo_inicio,
    periodoFim: f.periodo_fim,
    filtroProfissional: f.filtro_profissional,
    filtroTerapia: f.filtro_terapia,
    total: f.total,
  }));

const esquemaImportacao = z
  .object({
    arquivo_nome: z.string(),
    criado_em: z.string(),
    favorecido: esquemaFavorecido,
    analises: z.array(z.object({ data: z.string(), texto: z.string(), falta: z.boolean() })),
  })
  .transform((i): Importacao => ({
    arquivo: i.arquivo_nome,
    importadoEm: i.criado_em,
    favorecido: i.favorecido,
    analises: i.analises,
  }));

const MENSAGENS: MensagensDoBanco = {
  sem_permissao: 'Só o coordenador da carteira importa o PDF do Tita.',
  indisponivel: 'Não foi possível gravar a importação agora. Tente de novo em instantes.',
  regras: {
    evolucao_fechada: 'A evolução não está em conferência. Reabra antes de importar.',
    tita_leitura_invalida: 'A leitura do PDF não pôde ser gravada. Exporte de novo no Tita.',
    tita_outro_assistido: 'O PDF é de outro favorecido, não do assistido desta evolução.',
    tita_periodo_incompleto: 'O período avaliado do PDF não cobre o período analisado inteiro.',
    tita_outra_terapia: 'O PDF não é da terapia ABA.',
    tita_filtro_de_profissional: 'O PDF foi exportado com filtro de profissional.',
  },
};

/** A importação atual da evolução (a última gravada), ou `null` se ela não tem PDF do Tita. */
export async function buscarImportacao(evolucaoId: string): Promise<Importacao | null> {
  const { data, error } = await supabase
    .schema('evolucao')
    .from('importacoes')
    .select('arquivo_nome, criado_em, favorecido, analises')
    .eq('evolucao_id', evolucaoId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<unknown>();
  if (error !== null) {
    throw erroDoBanco(error, {
      indisponivel: 'Não foi possível carregar o PDF do Tita agora. Tente de novo em instantes.',
    });
  }
  return data === null ? null : esquemaImportacao.parse(data);
}

/** Grava a leitura do PDF na evolução; os dias analisados (E20) são do banco. */
export async function gravarImportacao(
  evolucaoId: string,
  arquivo: string,
  { favorecido, analises }: Leitura,
): Promise<void> {
  const { error } = await supabase
    .schema('evolucao')
    .from('importacoes')
    .insert({
      evolucao_id: evolucaoId,
      arquivo_nome: arquivo.slice(0, 200),
      favorecido: {
        nome: favorecido.nome,
        idade: favorecido.idade,
        genero: favorecido.genero,
        terapias: favorecido.terapias,
        profissionais: favorecido.profissionais,
        periodo_inicio: favorecido.periodoInicio,
        periodo_fim: favorecido.periodoFim,
        filtro_profissional: favorecido.filtroProfissional,
        filtro_terapia: favorecido.filtroTerapia,
        total: favorecido.total,
      },
      analises,
    });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}
