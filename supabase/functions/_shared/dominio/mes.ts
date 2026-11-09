/**
 * Mês da evolução, período analisado e prazo do arquivo do mês (regras E15 e E18).
 *
 * Domínio puro: TypeScript sem API de navegador, Node ou Deno, para rodar igual na tela e nas Edge
 * Functions. Datas são texto ISO (`AAAA-MM-DD`): nada de `Date` com fuso no meio da regra.
 * O mês da evolução é sempre o dia 1º (`2026-11-01` = evolução de novembro de 2026).
 */

/** Fuso da clínica (Recife, sem horário de verão). */
export const FUSO_DA_CLINICA = 'America/Recife';

/** Dia do mês até o qual o arquivo do mês vai a contas médicas (E15). */
export const DIA_DO_PRAZO = 10;

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const MES_REF = /^(\d{4})-(\d{2})-01$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

interface AnoMes {
  ano: number;
  mes: number;
}

interface MesLido extends AnoMes {
  nome: string;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function lerMesRef(mesRef: string): MesLido {
  const partes = MES_REF.exec(mesRef);
  const mes = Number(partes?.[2]);
  // Mês 00 ou 13 não tem nome: a mesma checagem valida o número.
  const nome = MESES[mes - 1];
  if (partes === null || nome === undefined) {
    throw new RangeError('Mês da evolução inválido: use AAAA-MM-01.');
  }
  return { ano: Number(partes[1]), mes, nome };
}

function escreverMesRef({ ano, mes }: AnoMes): string {
  return `${String(ano)}-${doisDigitos(mes)}-01`;
}

/** Soma (ou subtrai) meses a um mês da evolução. */
export function somarMeses(mesRef: string, meses: number): string {
  const { ano, mes } = lerMesRef(mesRef);
  const total = ano * 12 + (mes - 1) + meses;
  return escreverMesRef({ ano: Math.floor(total / 12), mes: (total % 12) + 1 });
}

function ultimoDia(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Data de hoje (`AAAA-MM-DD`) no fuso da clínica. */
export function hojeNaClinica(agora: Date): string {
  // O formato en-CA já é AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_DA_CLINICA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** O mês da evolução aberto em uma data: o mês corrente (E18). */
export function mesDaEvolucao(hoje: string): string {
  const partes = DATA.exec(hoje);
  if (partes === null) throw new RangeError('Data inválida: use AAAA-MM-DD.');
  return escreverMesRef({ ano: Number(partes[1]), mes: Number(partes[2]) });
}

/**
 * Período analisado (E18): do dia 1º ao último dia do mês anterior ao mês da evolução.
 * A evolução de novembro analisa 01/10 a 31/10; a de janeiro, o dezembro do ano anterior.
 */
export function periodoAnalisado(mesRef: string): { inicio: string; fim: string } {
  const inicio = somarMeses(mesRef, -1);
  const { ano, mes } = lerMesRef(inicio);
  return { inicio, fim: `${String(ano)}-${doisDigitos(mes)}-${doisDigitos(ultimoDia(ano, mes))}` };
}

/** Prazo do arquivo do mês (E15): dia 10 do mês da evolução. */
export function prazoDoArquivo(mesRef: string): string {
  const { ano, mes } = lerMesRef(mesRef);
  return `${String(ano)}-${doisDigitos(mes)}-${doisDigitos(DIA_DO_PRAZO)}`;
}

/** Dias corridos de `hoje` até o prazo do arquivo do mês; negativo quando o prazo passou. */
export function diasAtePrazo(hoje: string, mesRef: string): number {
  const emDias = (data: string) => Date.parse(`${data}T00:00:00Z`) / 86_400_000;
  if (!DATA.test(hoje)) throw new RangeError('Data inválida: use AAAA-MM-DD.');
  return emDias(prazoDoArquivo(mesRef)) - emDias(hoje);
}

/** `nov/2026` */
export function formatarMesCurto(mesRef: string): string {
  const { ano, nome } = lerMesRef(mesRef);
  return `${nome.slice(0, 3)}/${String(ano)}`;
}

/** `novembro de 2026` */
export function formatarMesLongo(mesRef: string): string {
  const { ano, nome } = lerMesRef(mesRef);
  return `${nome} de ${String(ano)}`;
}

/** `novembro` */
export function nomeDoMes(mesRef: string): string {
  return lerMesRef(mesRef).nome;
}

/** `01/10/2026`; com `semAno`, `01/10`. */
export function formatarData(data: string, semAno = false): string {
  if (!DATA.test(data)) throw new RangeError('Data inválida: use AAAA-MM-DD.');
  const diaEMes = `${data.slice(8, 10)}/${data.slice(5, 7)}`;
  return semAno ? diaEMes : `${diaEMes}/${data.slice(0, 4)}`;
}

/** O mês da evolução e os `quantidade - 1` anteriores, do mais novo ao mais antigo. */
export function mesesRecentes(mesRef: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarMeses(mesRef, -i));
}

/** Confere o formato do mês da evolução sem lançar erro (para validar a URL). */
export function ehMesRef(valor: string): boolean {
  try {
    lerMesRef(valor);
    return true;
  } catch {
    return false;
  }
}
