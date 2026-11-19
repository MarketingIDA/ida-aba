/** Os tipos e as constantes da evolução das metas em gráfico (E27). Domínio puro. */

export type SituacaoDaMetaNoProgresso = 'desenvolvimento' | 'alcancada' | 'manutencao' | 'suspensa';

/** Os filtros dos cards: três situações e as metas que pedem atenção. */
export const FILTROS_DO_PROGRESSO = [
  'desenvolvimento',
  'alcancada',
  'manutencao',
  'atencao',
] as const;
export type FiltroDoProgresso = (typeof FILTROS_DO_PROGRESSO)[number];

export const ehFiltroDoProgresso = (valor: string | null): valor is FiltroDoProgresso =>
  (FILTROS_DO_PROGRESSO as readonly (string | null)[]).includes(valor);

/** O nível mais alto da escada: independente. */
export const INDEPENDENTE = 5;

/** A partir de quantos dias no mesmo degrau a meta pede atenção. */
export const DIAS_PARADA = 21;

export interface MetaDoProgresso {
  id: number;
  programa: string | null;
  texto: string;
  situacao: SituacaoDaMetaNoProgresso;
}

/** Um ponto lido: a meta, o dia, o nível (nulo: trabalhada sem nível) e o trecho da análise. */
export interface PontoDoProgresso {
  metaId: number;
  data: string;
  nivel: number | null;
  trecho: string;
}

/** Um período analisado do assistido e se os níveis dele foram lidos. */
export interface PeriodoDoProgresso {
  inicio: string;
  fim: string;
  lido: boolean;
}

/** Uma semana do mapa de sessões de uma meta. */
export interface SemanaDaMeta {
  sessoes: number;
  niveis: number[];
  independente: boolean;
}

export interface AnaliseDaMeta {
  meta: MetaDoProgresso;
  pontos: PontoDoProgresso[];
  comNivel: PontoDoProgresso[];
  primeiro: PontoDoProgresso | null;
  ultimo: PontoDoProgresso | null;
  independente: PontoDoProgresso | null;
  /** Quantas sessões com nível até chegar à independência. */
  sessoesAteIndependente: number | null;
  /** Semanas no mesmo degrau (0: não está parada). */
  parada: number;
  /** Em desenvolvimento e sem registro no último período lido. */
  sumiu: boolean;
  atencao: boolean;
  semNivel: number;
  semanas: SemanaDaMeta[];
}

export interface Progresso {
  inicio: string;
  fim: string;
  /** A segunda-feira de cada semana da janela. */
  semanas: string[];
  metas: AnaliseDaMeta[];
  /** As metas com programa e não suspensas: as que sobem a escada. */
  ativas: number;
  independentes: number;
  /** Metas que já chegaram à independência, semana a semana. */
  porSemana: number[];
  contagem: Record<FiltroDoProgresso, number>;
  /** Dias com algum nível lido. */
  dias: number;
  periodosLidos: number;
  destaques: {
    rapida: AnaliseDaMeta | null;
    parada: AnaliseDaMeta | null;
    sumiu: AnaliseDaMeta | null;
  };
}
