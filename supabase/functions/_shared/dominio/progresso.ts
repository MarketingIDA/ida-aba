/**
 * A evolução das metas em gráfico (E27): os números da tela, calculados a partir dos níveis de
 * apoio que a IA leu. Os mesmos números servem à tela, à tabela e, depois, ao PDF (E28).
 *
 * Um período cuja importação não teve os níveis lidos não é um período sem trabalho: ele não conta
 * para "sem registro" nem para "mesmo degrau há N semanas". As datas são `AAAA-MM-DD`, contadas
 * em UTC para o fuso não mudar o dia.
 *
 * Domínio puro: a tela só desenha.
 */

import { acumuladoPorSemana, dias, segunda, semanaDe, semanasDaJanela } from './janela.ts';
import {
  type AnaliseDaMeta,
  DIAS_PARADA,
  type FiltroDoProgresso,
  INDEPENDENTE,
  type MetaDoProgresso,
  type PeriodoDoProgresso,
  type PontoDoProgresso,
  type Progresso,
  type SemanaDaMeta,
  type SituacaoDaMetaNoProgresso,
} from './progresso.tipos.ts';

export { fracaoDaJanela, semanasDaJanela } from './janela.ts';

export type {
  AnaliseDaMeta,
  FiltroDoProgresso,
  MetaDoProgresso,
  PeriodoDoProgresso,
  PontoDoProgresso,
  Progresso,
  SemanaDaMeta,
  SituacaoDaMetaNoProgresso,
} from './progresso.tipos.ts';
export {
  DIAS_PARADA,
  ehFiltroDoProgresso,
  FILTROS_DO_PROGRESSO,
  INDEPENDENTE,
} from './progresso.tipos.ts';

/** Semanas no último degrau, contadas do primeiro ponto dele até o fim da janela. */
function semanasParada(comNivel: readonly PontoDoProgresso[], fim: string): number {
  const ultimo = comNivel.at(-1);
  if (ultimo === undefined || ultimo.nivel === INDEPENDENTE) return 0;
  let desde = ultimo.data;
  for (const p of [...comNivel].reverse()) {
    if (p.nivel !== ultimo.nivel) break;
    desde = p.data;
  }
  const passados = dias(fim) - dias(desde);
  return passados >= DIAS_PARADA ? Math.floor(passados / 7) : 0;
}

function analisar(
  meta: MetaDoProgresso,
  pontos: readonly PontoDoProgresso[],
  primeiraSegunda: number,
  totalDeSemanas: number,
  ultimoPeriodo: PeriodoDoProgresso,
  fim: string,
): AnaliseDaMeta {
  const meus = pontos
    .filter((p) => p.metaId === meta.id)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
  const comNivel = meus.filter((p) => p.nivel !== null);
  const i5 = comNivel.findIndex((p) => p.nivel === INDEPENDENTE);
  const independente = comNivel[i5] ?? null;
  // Sem leitura no último período não dá para dizer que a meta sumiu ou parou.
  const acompanhada =
    meta.situacao === 'desenvolvimento' && meta.programa !== null && ultimoPeriodo.lido;
  const sumiu = acompanhada && !meus.some((p) => p.data >= ultimoPeriodo.inicio);
  const parada = acompanhada && !sumiu ? semanasParada(comNivel, fim) : 0;
  const semanaDaIndependencia =
    independente === null ? -1 : semanaDe(independente.data, primeiraSegunda);
  const porSemana = Array.from({ length: totalDeSemanas }, (_, w): SemanaDaMeta => {
    const daSemana = meus.filter((p) => semanaDe(p.data, primeiraSegunda) === w);
    const niveis = daSemana.flatMap((p) => (p.nivel === null ? [] : [p.nivel]));
    return {
      sessoes: daSemana.length,
      niveis: [...new Set(niveis)],
      independente: w === semanaDaIndependencia,
    };
  });
  return {
    meta,
    pontos: meus,
    comNivel,
    primeiro: comNivel[0] ?? null,
    ultimo: comNivel.at(-1) ?? null,
    independente,
    sessoesAteIndependente: i5 >= 0 ? i5 + 1 : null,
    parada,
    sumiu,
    atencao: parada > 0 || sumiu,
    semNivel: meus.length - comNivel.length,
    semanas: porSemana,
  };
}

const POSICAO: Record<SituacaoDaMetaNoProgresso, number> = {
  desenvolvimento: 1,
  manutencao: 2,
  alcancada: 3,
  suspensa: 4,
};
const subiu = (x: AnaliseDaMeta) => (x.ultimo?.nivel ?? 0) - (x.primeiro?.nivel ?? 0);

/** A ordem da tela: primeiro as que pedem atenção, depois as em desenvolvimento, as que mais subiram antes. */
export function ordemDoProgresso(a: AnaliseDaMeta, b: AnaliseDaMeta): number {
  const pos = (x: AnaliseDaMeta) => (x.atencao ? 0 : POSICAO[x.meta.situacao]);
  return pos(a) - pos(b) || subiu(b) - subiu(a);
}

/** As metas do card escolhido (ou todas), na ordem da tela. */
export function filtrarProgresso(
  metas: readonly AnaliseDaMeta[],
  filtro: FiltroDoProgresso | null,
): AnaliseDaMeta[] {
  return metas
    .filter(
      (x) => filtro === null || (filtro === 'atencao' ? x.atencao : x.meta.situacao === filtro),
    )
    .sort(ordemDoProgresso);
}

/** A meta de menor valor; valor nulo fica de fora. */
function menor(
  lista: readonly AnaliseDaMeta[],
  valor: (x: AnaliseDaMeta) => number | null,
): AnaliseDaMeta | null {
  let escolhida: AnaliseDaMeta | null = null;
  let melhor = Infinity;
  for (const x of lista) {
    const v = valor(x);
    if (v !== null && v < melhor) {
      escolhida = x;
      melhor = v;
    }
  }
  return escolhida;
}

/**
 * Os números da evolução das metas de um assistido. `null` quando não há período nenhum: sem
 * evolução, não há janela.
 */
export function calcularProgresso(
  metas: readonly MetaDoProgresso[],
  pontos: readonly PontoDoProgresso[],
  periodos: readonly PeriodoDoProgresso[],
): Progresso | null {
  const ordenados = [...periodos].sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  const primeiro = ordenados[0];
  const ultimo = ordenados.at(-1);
  if (primeiro === undefined || ultimo === undefined) return null;
  const { inicio } = primeiro;
  const { fim } = ultimo;
  const semanas = semanasDaJanela(inicio, fim);
  const primeiraSegunda = segunda(inicio);
  const naJanela = pontos.filter((p) => p.data >= inicio && p.data <= fim);
  const analises = metas.map((m) =>
    analisar(m, naJanela, primeiraSegunda, semanas.length, ultimo, fim),
  );
  const ativas = analises.filter((x) => x.meta.programa !== null && x.meta.situacao !== 'suspensa');
  const porSemana = acumuladoPorSemana(
    ativas.flatMap((x) => (x.independente === null ? [] : [x.independente.data])),
    inicio,
    fim,
  );
  const comNivel = naJanela.filter((p) => p.nivel !== null);
  return {
    inicio,
    fim,
    semanas,
    metas: analises,
    ativas: ativas.length,
    independentes: ativas.filter((x) => x.independente !== null).length,
    porSemana,
    contagem: {
      desenvolvimento: analises.filter((x) => x.meta.situacao === 'desenvolvimento').length,
      alcancada: analises.filter((x) => x.meta.situacao === 'alcancada').length,
      manutencao: analises.filter((x) => x.meta.situacao === 'manutencao').length,
      atencao: analises.filter((x) => x.atencao).length,
    },
    dias: new Set(comNivel.map((p) => p.data)).size,
    periodosLidos: ordenados.filter((p) => p.lido).length,
    destaques: {
      rapida: menor(analises, (x) => x.sessoesAteIndependente),
      parada: menor(analises, (x) => (x.parada > 0 ? -x.parada : null)),
      sumiu: analises.find((x) => x.sumiu) ?? null,
    },
  };
}
