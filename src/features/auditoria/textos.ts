import type { Evento } from '@/features/auditoria/api/auditoria.api';

/** O nome de cada tabela auditada, como a coordenação geral fala dela. */
export const NOME_DA_TABELA: Record<string, string> = {
  usuarios: 'Pessoa',
  assinaturas: 'Assinatura',
  unidades: 'Unidade',
  planos: 'Plano',
  carteiras: 'Carteira',
  assistidos: 'Assistido',
  metas: 'Meta do assistido',
  termos_inadequados: 'Termo inadequado',
  unidades_da_tita: 'Unidade da Tita',
  sincronizacoes_da_tita: 'Sincronização com a Tita',
  evolucoes: 'Evolução',
  partes: 'Parte da evolução',
  versoes: 'Versão de uma parte',
  importacoes: 'Importação do Tita',
  documentos: 'Outro documento',
  arquivos: 'Arquivo do mês',
  devolucoes: 'Devolução',
  dicas_ia: 'Dica para a IA',
  orientacoes_ia: 'Orientação da IA',
  lacunas_ignoradas: 'Lacuna ignorada',
  ciencias_da_importacao: 'Ciência dos alertas',
  relatorios_de_metas: 'Relatório de metas',
};

/** As ações sem gravação (operação `A`). */
export const NOME_DA_ACAO: Record<string, string> = {
  entrou: 'Entrou no sistema',
  saiu: 'Saiu do sistema',
  abriu_evolucao: 'Abriu a evolução',
  abriu_progresso: 'Abriu a evolução das metas',
  abriu_metas: 'Abriu as metas do assistido',
  baixou_evolucao_word: 'Baixou a evolução em Word',
  baixou_arquivo_word: 'Baixou o arquivo do mês em Word',
};

const VERBO = { I: 'Criou', U: 'Alterou', D: 'Excluiu' } as const;

/** "Alterou · Evolução" ou "Entrou no sistema". */
export function descreverEvento(evento: Evento): string {
  if (evento.operacao === 'A') return NOME_DA_ACAO[evento.acao ?? ''] ?? evento.acao ?? 'Ação';
  const tabela = NOME_DA_TABELA[evento.tabela] ?? evento.tabela;
  return `${VERBO[evento.operacao]} · ${tabela}`;
}

/** As opções do filtro "O quê": primeiro as ações, depois os registros. */
export const TIPOS_DO_FILTRO: readonly { valor: string; rotulo: string }[] = [
  ...Object.entries(NOME_DA_ACAO).map(([valor, rotulo]) => ({ valor, rotulo })),
  ...Object.entries(NOME_DA_TABELA)
    .map(([valor, rotulo]) => ({ valor, rotulo }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
];

/** Valor de um campo para a tela: curto, numa linha. */
export function valorLegivel(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor);
  return JSON.stringify(valor);
}

const QUANDO = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'America/Recife',
});

export const formatarQuando = (iso: string) => QUANDO.format(new Date(iso));
