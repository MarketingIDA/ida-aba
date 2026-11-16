/**
 * A lista de favorecidos da API da Tita, lida e normalizada antes de ir ao banco (E28).
 *
 * Domínio puro: TypeScript sem API de navegador, Node ou Deno, para rodar igual na tela e nas Edge
 * Functions. Do favorecido saem só o id, o nome, o gênero, o nascimento, se está ativo e as
 * unidades. CPF, responsáveis e telefones ficam aqui e não vão ao banco nem ao log.
 */

/** O caminho da consulta de favorecidos da empresa. */
export const CAMINHO_DA_TITA = '/api/cadastro/favorecido/consulta/empresa';

/** O endereço documentado pela Tita, usado quando o segredo `TITA_ENDPOINT` não serve. */
export const URL_PADRAO_DA_TITA = `https://apiv2.apptita.com.br${CAMINHO_DA_TITA}`;

export type GeneroDaTita = 'feminino' | 'masculino';

/** Um favorecido como vai para `cadastro.sincronizar_tita` (nomes de coluna do banco). */
export interface FavorecidoDaTita {
  tita_id: number;
  nome: string;
  /** "Outros" ou vazio na Tita: nulo, e o assistido entra sem gênero (rascunho). */
  genero: GeneroDaTita | null;
  /** `AAAA-MM-DD`, ou nulo se a Tita mandou vazio ou um dia que não existe. */
  data_nascimento: string | null;
  data_invalida: boolean;
  ativo: boolean;
  unidades: string[];
}

export interface ListaDaTita {
  favorecidos: FavorecidoDaTita[];
  /** Quantos vieram sem id: ficam de fora, e a sincronização avisa. */
  semId: number;
}

/** A resposta não é a lista que a Tita documenta. */
export class FormatoDaTita extends Error {
  constructor() {
    super('A Tita devolveu um formato inesperado.');
    this.name = 'FormatoDaTita';
  }
}

const HTTPS = /^(https:\/\/[^\s/?#]+)(\/[^\s#]*)?$/i;

/**
 * O endereço da consulta: o do segredo `TITA_ENDPOINT` quando é um https válido (só o domínio
 * ganha o caminho da consulta), ou o padrão.
 */
export function urlDaTita(endpoint: string | undefined): string {
  const valor = (endpoint ?? '').trim();
  const partes = HTTPS.exec(valor);
  if (partes === null) return URL_PADRAO_DA_TITA;
  const caminho = partes[2];
  return caminho === undefined || caminho === '/'
    ? `${String(partes[1])}${CAMINHO_DA_TITA}`
    : valor;
}

/** Espaços repetidos viram um, e as pontas saem. */
const semEspacosSobrando = (texto: string) => texto.replace(/\s+/gu, ' ').trim();

function lerId(valor: unknown): number | null {
  const numero =
    typeof valor === 'string' && /^\d{1,15}$/.test(valor.trim()) ? Number(valor.trim()) : valor;
  return typeof numero === 'number' && Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function lerGenero(sexo: unknown): GeneroDaTita | null {
  if (typeof sexo !== 'string') return null;
  const valor = sexo.trim().toLowerCase();
  return valor === 'feminino' || valor === 'masculino' ? valor : null;
}

const DATA_DA_TITA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** `dd/mm/aaaa` (o formato da Tita) ou `aaaa-mm-dd`, se for um dia que existe; senão nulo. */
export function lerData(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  const br = DATA_DA_TITA.exec(texto);
  const partes = br === null ? DATA_ISO.exec(texto)?.slice(1) : [br[3], br[2], br[1]];
  if (partes === undefined) return null;
  const [ano, mes, dia] = partes.map(Number) as [number, number, number];
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  if (mes < 1 || mes > 12 || dia < 1 || dia > ultimoDia) return null;
  return `${String(ano).padStart(4, '0')}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** Os nomes das unidades, sem repetição e sem os vazios. */
function lerUnidades(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const nomes = valor
    .filter((nome): nome is string => typeof nome === 'string')
    .map(semEspacosSobrando)
    .filter((nome) => nome !== '');
  return [...new Set(nomes)];
}

/** Lê a resposta da Tita. Quem vem sem id fica de fora e é contado. */
export function lerFavorecidos(resposta: unknown): ListaDaTita {
  if (!Array.isArray(resposta)) throw new FormatoDaTita();
  const favorecidos: FavorecidoDaTita[] = [];
  let semId = 0;
  for (const item of resposta as unknown[]) {
    const registro: Record<string, unknown> =
      typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    const titaId = lerId(registro.id);
    if (titaId === null) {
      semId += 1;
      continue;
    }
    const data = lerData(registro.data_nascimento);
    favorecidos.push({
      tita_id: titaId,
      nome: typeof registro.nome === 'string' ? semEspacosSobrando(registro.nome) : '',
      genero: lerGenero(registro.sexo),
      data_nascimento: data,
      data_invalida: data === null,
      ativo: registro.ativo !== false,
      unidades: lerUnidades(registro.unidades),
    });
  }
  return { favorecidos, semId };
}
