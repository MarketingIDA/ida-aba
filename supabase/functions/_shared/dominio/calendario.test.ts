import { describe, expect, it } from 'vitest';

import { datasDeFora, semanasDoPeriodo } from './calendario.ts';

describe('calendário dos dias analisados (E19, E20)', () => {
  it('monta as semanas do mês e separa as datas de fora do período', () => {
    const analises = [
      { data: '2026-09-30', falta: false },
      { data: '2026-10-01', falta: false },
      { data: '2026-10-01', falta: true },
      { data: '2026-10-02', falta: true },
      { data: '2026-11-02', falta: false },
      { data: '2026-11-02', falta: false },
    ];
    // Outubro de 2026 começa numa quinta-feira e tem 31 dias.
    const semanas = semanasDoPeriodo('2026-10-01', analises);
    expect(semanas).toHaveLength(5);
    expect(semanas[0]?.slice(0, 4)).toEqual([null, null, null, null]);
    expect(semanas[0]?.[4]).toEqual({ data: '2026-10-01', dia: 1, situacao: 'sessao', sessoes: 1 });
    expect(semanas[0]?.[5]?.situacao).toBe('falta');
    expect(semanas[0]?.[6]?.situacao).toBe('sem');
    expect(semanas[4]?.at(-1)?.dia).toBe(31);
    // Novembro de 2026 começa num domingo e tem 30 dias: a última semana termina vazia.
    expect(semanasDoPeriodo('2026-11-01', []).at(-1)?.at(-1)).toBeNull();

    expect(datasDeFora(analises, '2026-10-01', '2026-10-31')).toEqual([
      { data: '2026-09-30', antes: true },
      { data: '2026-11-02', antes: false },
    ]);
  });
});
