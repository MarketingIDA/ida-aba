import { FUSO_DA_CLINICA } from '@dominio/mes.ts';

/** "1 evolução", "3 evoluções". */
export function plural(n: number, singular: string, varias: string): string {
  return `${String(n)} ${n === 1 ? singular : varias}`;
}

/** "faltam 6 dias", "falta 1 dia", "o prazo é hoje", "o prazo passou há 2 dias". */
export function textoDoPrazo(dias: number): string {
  if (dias > 1) return `faltam ${String(dias)} dias`;
  if (dias === 1) return 'falta 1 dia';
  if (dias === 0) return 'o prazo é hoje';
  return dias === -1 ? 'o prazo passou há 1 dia' : `o prazo passou há ${String(-dias)} dias`;
}

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DA_CLINICA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "11/11/2026 às 14:32", no horário da clínica. */
export function dataEHora(instante: string): string {
  const partes = new Map(
    DATA_HORA.formatToParts(new Date(instante)).map((p) => [p.type, p.value] as const),
  );
  const de = (tipo: Intl.DateTimeFormatPartTypes) => partes.get(tipo) ?? '';
  return `${de('day')}/${de('month')}/${de('year')} às ${de('hour')}:${de('minute')}`;
}
