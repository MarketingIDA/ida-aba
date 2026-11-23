/**
 * O calendário dos dias analisados (E19, E20): o mês do período com cada dia marcado como sessão,
 * falta ou sem evolução diária, e as datas que o PDF trouxe fora do período, com o motivo. Uma
 * data antes do período pode já ter entrado noutra evolução; uma depois fica para a seguinte.
 */
export type SituacaoDoDia = 'sessao' | 'falta' | 'sem';

export interface DiaDoCalendario {
  /** `AAAA-MM-DD` */
  data: string;
  dia: number;
  situacao: SituacaoDoDia;
  /** Evoluções diárias que não são falta, naquele dia. */
  sessoes: number;
}

export interface DataDeFora {
  data: string;
  antes: boolean;
}

interface AnaliseDoDia {
  data: string;
  falta: boolean;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** A situação do dia: sessão se houve ao menos uma; falta se só houve falta. */
function situacaoDe(doDia: readonly AnaliseDoDia[]): SituacaoDoDia {
  if (doDia.length === 0) return 'sem';
  return doDia.some((a) => !a.falta) ? 'sessao' : 'falta';
}

/**
 * As semanas do mês do período, de domingo a sábado; `null` é a casa antes do dia 1 ou depois do
 * último dia. O período é um mês inteiro (E18): `inicio` é o dia 1.
 */
export function semanasDoPeriodo(
  inicio: string,
  analises: readonly AnaliseDoDia[],
): (DiaDoCalendario | null)[][] {
  const [ano = 0, mes = 1] = inicio.split('-').map(Number);
  const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const totalDeDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const casas: (DiaDoCalendario | null)[] = Array.from({ length: primeiroDia }, () => null);
  for (let dia = 1; dia <= totalDeDias; dia++) {
    const data = `${String(ano)}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
    const doDia = analises.filter((a) => a.data === data);
    casas.push({
      data,
      dia,
      situacao: situacaoDe(doDia),
      sessoes: doDia.filter((a) => !a.falta).length,
    });
  }
  while (casas.length % 7 !== 0) casas.push(null);
  return Array.from({ length: casas.length / 7 }, (_, i) => casas.slice(i * 7, i * 7 + 7));
}

/** As datas do PDF fora do período, sem repetir e em ordem, com o lado em que ficaram. */
export function datasDeFora(
  analises: readonly AnaliseDoDia[],
  inicio: string,
  fim: string,
): DataDeFora[] {
  const datas = [...new Set(analises.map((a) => a.data))]
    .filter((d) => d < inicio || d > fim)
    .sort((a, b) => a.localeCompare(b));
  return datas.map((data) => ({ data, antes: data < inicio }));
}
