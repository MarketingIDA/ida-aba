import { formatarData, periodoAnalisado } from '@dominio/mes.ts';

/**
 * Leitura do Relatório de Evoluções Diárias do Tita (E02): do PDF entram só o bloco "Dados do
 * Favorecido" e, de cada evolução diária, a data e o texto da "Análise do Atendimento". O resto
 * (sentimentos, comportamento, objetivo, planejamento) é descartado. Funções puras: recebem as
 * linhas de texto do PDF, já sem o cabeçalho e o rodapé de cada página.
 */
export interface Favorecido {
  nome: string;
  idade: string;
  genero: string;
  terapias: string;
  profissionais: string;
  periodoInicio: string;
  periodoFim: string;
  filtroProfissional: string;
  filtroTerapia: string;
  /** O "Total de Evoluções Diárias" que o PDF informa. */
  total: number | null;
}

export interface AnaliseLida {
  /** `AAAA-MM-DD` */
  data: string;
  texto: string;
  /** A análise registra que o assistido não veio (E04). */
  falta: boolean;
}

export interface Leitura {
  favorecido: Favorecido;
  analises: AnaliseLida[];
}

const INICIO_DA_EVOLUCAO = 'Dados da Evolução Diária:';
const ANALISE = 'Análise do Atendimento';
/** O que vem depois da análise, dentro da mesma evolução diária. */
const FIM_DA_ANALISE = new Set([
  'Fatores de Impacto',
  'PLANEJAMENTO',
  'Considerações para o próximo atendimento',
]);
const SEM_TEXTO = 'Sem dados cadastrados';
/** Sobras de cabeçalho e rodapé que podem cair no meio de uma análise (E02). */
const DE_PAGINA = [/^Relatório de Evoluções Diárias$/, /^Periodo: .*Favorecido:/, /Página \d+$/];
/** Como a análise costuma registrar que o assistido não veio (E04). */
const FALTAS = [
  /n[ãa]o\s+(compareceu|veio)/i,
  /n[ãa]o\s+p[oô]de\s+(vir|comparecer)/i,
  /faltou\s+(à|a|ao)\s/i,
  /assistid[oa]\s+faltou/i,
];

/** `05/10/26` ou `05/10/2026` → `2026-10-05`; `null` se não é data. */
function dataIso(texto: string): string | null {
  const partes = /(\d{2})\/(\d{2})\/(\d{4}|\d{2})/.exec(texto);
  if (partes === null) return null;
  const [, dia = '', mes = '', ano = ''] = partes;
  const anoInteiro = ano.length === 2 ? '20' + ano : ano;
  return `${anoInteiro}-${mes}-${dia}`;
}

/** O que vem depois de "Rótulo:" na primeira linha que começa por ele. */
function valorDe(linhas: readonly string[], rotulo: string): string {
  const linha = linhas.find((l) => l.startsWith(`${rotulo}:`));
  return linha === undefined
    ? ''
    : linha
        .slice(rotulo.length + 1)
        .trim()
        .replace(/\.$/, '');
}

function lerFavorecido(bloco: readonly string[]): Favorecido {
  const [inicio = '', fim = ''] = valorDe(bloco, 'Período avaliado').split(' - ');
  const filtros = bloco.slice(bloco.indexOf('Filtros Aplicados:') + 1);
  const total = Number(valorDe(bloco, 'Total de Evoluções Diárias'));
  return {
    nome: valorDe(bloco, 'Nome'),
    idade: valorDe(bloco, 'Idade'),
    genero: valorDe(bloco, 'Gênero'),
    terapias: valorDe(bloco, 'Terapias'),
    profissionais: valorDe(bloco, 'Profissionais'),
    periodoInicio: dataIso(inicio) ?? '',
    periodoFim: dataIso(fim) ?? '',
    filtroProfissional: valorDe(filtros, 'Profissional'),
    filtroTerapia: valorDe(filtros, 'Terapia'),
    total: Number.isInteger(total) && total > 0 ? total : null,
  };
}

/** A evolução diária de um bloco; `null` se ele não traz a data. */
function lerAnalise(bloco: readonly string[]): AnaliseLida | null {
  const data = dataIso(valorDe(bloco, 'Data'));
  if (data === null) return null;
  const inicio = bloco.indexOf(ANALISE);
  const depois = inicio === -1 ? [] : bloco.slice(inicio + 1);
  const fim = depois.findIndex((l) => FIM_DA_ANALISE.has(l));
  const texto = (fim === -1 ? depois : depois.slice(0, fim))
    .filter((l) => l !== SEM_TEXTO)
    .join(' ');
  return { data, texto, falta: FALTAS.some((padrao) => padrao.test(texto)) };
}

/** Lê o relatório; `null` quando as linhas não são de um Relatório de Evoluções Diárias. */
export function lerRelatorio(linhasDoPdf: readonly string[]): Leitura | null {
  const linhas = linhasDoPdf
    .map((l) => l.replaceAll(/\s+/g, ' ').trim())
    .filter((l) => l !== '' && !DE_PAGINA.some((padrao) => padrao.test(l)));
  const comeco = linhas.indexOf('Dados do Favorecido');
  if (comeco === -1) return null;

  const blocos: string[][] = [[]];
  for (const linha of linhas.slice(comeco + 1)) {
    if (linha === INICIO_DA_EVOLUCAO) blocos.push([]);
    else blocos.at(-1)?.push(linha);
  }
  const [doFavorecido = [], ...diarias] = blocos;
  const favorecido = lerFavorecido(doFavorecido);
  if (favorecido.nome === '' || favorecido.periodoInicio === '' || favorecido.periodoFim === '') {
    return null;
  }
  return {
    favorecido,
    analises: diarias.map(lerAnalise).filter((a) => a !== null),
  };
}

export interface Conferencia {
  /** Impedem a importação (E03). */
  bloqueios: string[];
  /** Não impedem; o coordenador confere no Tita (E03, E19). */
  alertas: string[];
  noPeriodo: AnaliseLida[];
  foraDoPeriodo: AnaliseLida[];
}

/** Sem acento, em minúsculas e com um espaço só, como o banco compara os nomes. */
const semAcento = (texto: string) =>
  texto.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase().replaceAll(/\s+/g, ' ').trim();

/** "ABA", "Terapia ABA" ou "Terapia ABA.": o Tita escreve a terapia das duas formas. */
const ehAba = (texto: string) =>
  semAcento(texto)
    .replace(/\.$/, '')
    .replace(/^terapia /, '') === 'aba';

/**
 * O PDF é da terapia ABA: o filtro diz ABA ou, sem filtro de terapia ("Todas" ou ausente), o
 * favorecido só tem ABA. O banco confere do mesmo jeito (`interno.do_tita_da_terapia_aba`).
 */
function daTerapiaAba(favorecido: Favorecido): boolean {
  const filtro = semAcento(favorecido.filtroTerapia);
  if (filtro === '' || filtro === 'todas') return ehAba(favorecido.terapias);
  return ehAba(favorecido.filtroTerapia);
}

const diaEMes = (data: string) => formatarData(data, true);

/** As análises cujo texto cita um dia diferente do dia do registro (E19). */
function comOutraData(analises: readonly AnaliseLida[]): string[] {
  return analises
    .filter((a) =>
      [...a.texto.matchAll(/\b(\d{2})\/(\d{2})(?:\/\d{2,4})?\b/g)].some(
        ([, dia = '', mes = '']) => `${dia}/${mes}` !== diaEMes(a.data),
      ),
    )
    .map((a) => diaEMes(a.data));
}

function bloqueiosDa(leitura: Leitura, assistido: string, mesRef: string, noPeriodo: number) {
  const { favorecido } = leitura;
  const { inicio, fim } = periodoAnalisado(mesRef);
  const bloqueios: string[] = [];
  if (semAcento(favorecido.nome) !== semAcento(assistido)) {
    bloqueios.push(`O PDF é de ${favorecido.nome}, não de ${assistido}.`);
  }
  if (favorecido.periodoInicio > inicio || favorecido.periodoFim < fim) {
    bloqueios.push(
      `O período avaliado do PDF (${diaEMes(favorecido.periodoInicio)} a ${formatarData(favorecido.periodoFim)}) não cobre o período analisado inteiro, de ${diaEMes(inicio)} a ${formatarData(fim)}. Exporte de novo no Tita.`,
    );
  }
  if (!daTerapiaAba(favorecido)) {
    bloqueios.push('O PDF não é da terapia ABA. Exporte no Tita com a terapia ABA.');
  }
  if (semAcento(favorecido.filtroProfissional) !== 'todos') {
    bloqueios.push(
      'O PDF foi exportado com filtro de profissional. Exporte no Tita com "Todos" os profissionais.',
    );
  }
  if (noPeriodo === 0) bloqueios.push('O PDF não tem evolução diária no período analisado.');
  return bloqueios;
}

/** Confere a leitura com o assistido e o mês da evolução: o que bloqueia e o que só alerta. */
export function conferirLeitura(leitura: Leitura, assistido: string, mesRef: string): Conferencia {
  const { inicio, fim } = periodoAnalisado(mesRef);
  const { favorecido, analises } = leitura;
  const noPeriodo = analises.filter((a) => a.data >= inicio && a.data <= fim);
  const foraDoPeriodo = analises.filter((a) => a.data < inicio || a.data > fim);
  const alertas: string[] = [];
  if (favorecido.periodoInicio < inicio || favorecido.periodoFim > fim) {
    alertas.push(
      'O PDF cobre mais que o período analisado. As evoluções diárias de fora não entram.',
    );
  }
  if (favorecido.total !== null && favorecido.total !== analises.length) {
    alertas.push(
      `O PDF informa ${String(favorecido.total)} evoluções diárias, e o sistema leu ${String(analises.length)}. Confira no Tita.`,
    );
  }
  if (foraDoPeriodo.length > 0) {
    alertas.push(
      `Ficaram de fora, por terem data fora do período: ${foraDoPeriodo.map((a) => diaEMes(a.data)).join(', ')}.`,
    );
  }
  const outraData = comOutraData(noPeriodo);
  if (outraData.length > 0) {
    alertas.push(
      `A análise cita uma data diferente da data do registro em: ${outraData.join(', ')}. Confira no Tita.`,
    );
  }
  return {
    bloqueios: bloqueiosDa(leitura, assistido, mesRef, noPeriodo.length),
    alertas,
    noPeriodo,
    foraDoPeriodo,
  };
}
