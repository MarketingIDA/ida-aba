import { periodoAnalisado } from './mes.ts';
import { type Genero, trocarNome } from './pseudonimo.ts';

/**
 * Outros documentos da evolução (E25): relatório da escola, de outra terapia, registro da família,
 * avaliação, PEI. O texto lido vai para a IA sem o nome do assistido (E05). Sem o nome no texto, o
 * coordenador confirma que o documento é do assistido; a data é sugerida e ele corrige. Documento
 * sem data ou de fora do período analisado entra como contexto, com alerta.
 *
 * Domínio puro: roda igual no navegador e nas Edge Functions.
 */
export const TIPOS_DE_DOCUMENTO = {
  escola: 'Relatório escolar',
  terapia: 'Outra terapia',
  familia: 'Registro da família',
  avaliacao: 'Avaliação',
  pei: 'PEI ou plano terapêutico',
  outro: 'Outro',
} as const;

export type TipoDeDocumento = keyof typeof TIPOS_DE_DOCUMENTO;

/** O máximo de texto por documento, como no banco: todos vão no mesmo pedido à IA. */
export const MAXIMO_DO_DOCUMENTO = 20_000;

/** O máximo de documentos na lista de uma evolução, como no banco. */
export const MAXIMO_DE_DOCUMENTOS = 8;

export interface DocumentoConferido {
  arquivo: string;
  paginas: number | null;
  /** O texto sem o nome do assistido. */
  texto: string;
  /** Quantas vezes o nome foi trocado; zero pede a confirmação do coordenador. */
  trocas: number;
  /** O texto passou do máximo e foi cortado. */
  cortado: boolean;
  /** `AAAA-MM-DD`: a data mais recente do texto que não está no futuro. */
  dataSugerida: string | null;
  tipoSugerido: TipoDeDocumento;
}

const MESES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const NUMERICA = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g;
const POR_EXTENSO = /(?<!\d)(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})(?!\d)/g;

/** `AAAA-MM-DD`, se dia, mês e ano formam uma data que existe. */
function dataValida(dia: number, mes: number, ano: number): string | null {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia)
    return null;
  return data.toISOString().slice(0, 10);
}

/** As datas escritas no texto, em `AAAA-MM-DD`: "15/10/2026", "15-10-26" e "15 de outubro de 2026". */
export function datasDoTexto(texto: string): string[] {
  const semAcento = texto.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();
  const datas: string[] = [];
  for (const [, dia, mes, ano] of semAcento.matchAll(NUMERICA)) {
    const anoInteiro = String(ano).length === 2 ? 2000 + Number(ano) : Number(ano);
    const data = dataValida(Number(dia), Number(mes), anoInteiro);
    if (data !== null) datas.push(data);
  }
  for (const [, dia, nomeDoMes, ano] of semAcento.matchAll(POR_EXTENSO)) {
    const mes = MESES.indexOf(String(nomeDoMes)) + 1;
    const data = mes === 0 ? null : dataValida(Number(dia), mes, Number(ano));
    if (data !== null) datas.push(data);
  }
  return datas;
}

/** O tipo pelo que o texto diz de si; na dúvida, "outro", e o coordenador escolhe. */
export function tipoDoTexto(texto: string): TipoDeDocumento {
  const t = texto.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();
  if (/\bpei\b|plano (educacional|terapeutico) individual/.test(t)) return 'pei';
  if (/fonoaudiolog|terapia ocupacional|psicopedagog|fisioterap|psicolog/.test(t)) return 'terapia';
  if (/\bescola|professor|sala de aula|coordenacao pedagogica/.test(t)) return 'escola';
  if (/avaliacao|\bvb-mapp\b|\bablls\b|\bprotocolo\b/.test(t)) return 'avaliacao';
  if (/\bfamilia|\bmae\b|\bpai\b|responsave/.test(t)) return 'familia';
  return 'outro';
}

/** O texto lido, sem linhas em branco repetidas nem espaços nas pontas. */
function arrumar(texto: string): string {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.replaceAll(/\s+/g, ' ').trim())
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Confere o texto lido de um documento: tira o nome do assistido, conta as trocas, corta no máximo
 * e sugere a data (a mais recente até hoje) e o tipo.
 */
export function conferirDocumento(
  lido: { arquivo: string; paginas: number | null; texto: string },
  assistido: { nome: string; genero: Genero },
  hoje: string,
): DocumentoConferido {
  const arrumado = arrumar(lido.texto);
  const { texto, trocas } = trocarNome(arrumado, assistido.nome, assistido.genero);
  const datas = datasDoTexto(arrumado).filter((data) => data <= hoje);
  return {
    arquivo: lido.arquivo,
    paginas: lido.paginas,
    texto: texto.slice(0, MAXIMO_DO_DOCUMENTO),
    trocas,
    cortado: texto.length > MAXIMO_DO_DOCUMENTO,
    dataSugerida: datas.toSorted((a, b) => a.localeCompare(b)).at(-1) ?? null,
    tipoSugerido: tipoDoTexto(arrumado),
  };
}

/** Sem data ou de fora do período analisado, o documento entra como contexto, com alerta. */
export function situacaoDaData(
  data: string | null,
  mesRef: string,
): 'no_periodo' | 'sem_data' | 'fora_do_periodo' {
  if (data === null) return 'sem_data';
  const { inicio, fim } = periodoAnalisado(mesRef);
  return data >= inicio && data <= fim ? 'no_periodo' : 'fora_do_periodo';
}
