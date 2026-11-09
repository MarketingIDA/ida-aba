import { describe, expect, it } from 'vitest';

import {
  diasAtePrazo,
  ehMesRef,
  formatarData,
  formatarMesCurto,
  formatarMesLongo,
  hojeNaClinica,
  mesDaEvolucao,
  mesesRecentes,
  nomeDoMes,
  periodoAnalisado,
  prazoDoArquivo,
  somarMeses,
} from './mes.ts';

describe('período analisado (E18)', () => {
  it('a evolução de novembro analisa 01/10 a 31/10', () => {
    expect(periodoAnalisado('2026-11-01')).toEqual({ inicio: '2026-10-01', fim: '2026-10-31' });
  });

  it('a de janeiro analisa o dezembro do ano anterior', () => {
    expect(periodoAnalisado('2027-01-01')).toEqual({ inicio: '2026-12-01', fim: '2026-12-31' });
  });

  it('a de março analisa o fevereiro inteiro, inclusive em ano bissexto', () => {
    expect(periodoAnalisado('2028-03-01')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' });
    expect(periodoAnalisado('2027-03-01')).toEqual({ inicio: '2027-02-01', fim: '2027-02-28' });
  });

  it('recusa mês fora do formato', () => {
    expect(() => periodoAnalisado('2026-11-05')).toThrow(RangeError);
    expect(() => periodoAnalisado('2026-13-01')).toThrow(RangeError);
    expect(() => periodoAnalisado('2026-00-01')).toThrow(RangeError);
  });
});

describe('mês da evolução', () => {
  it('é o mês corrente, no dia 1º', () => {
    expect(mesDaEvolucao('2026-11-04')).toBe('2026-11-01');
    expect(() => mesDaEvolucao('04/11/2026')).toThrow(RangeError);
  });

  it('usa o fuso de Recife: 02h UTC do dia 1º ainda é o mês anterior na clínica', () => {
    expect(hojeNaClinica(new Date('2026-12-01T02:00:00Z'))).toBe('2026-11-30');
    expect(hojeNaClinica(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12-01');
  });

  it('soma e subtrai meses atravessando o ano', () => {
    expect(somarMeses('2026-11-01', 2)).toBe('2027-01-01');
    expect(somarMeses('2026-01-01', -1)).toBe('2025-12-01');
    expect(mesesRecentes('2026-02-01', 3)).toEqual(['2026-02-01', '2026-01-01', '2025-12-01']);
  });

  it('confere o formato sem lançar erro', () => {
    expect(ehMesRef('2026-11-01')).toBe(true);
    expect(ehMesRef('2026-11')).toBe(false);
  });
});

describe('prazo do arquivo do mês (E15)', () => {
  it('é o dia 10 do mês da evolução', () => {
    expect(prazoDoArquivo('2026-11-01')).toBe('2026-11-10');
  });

  it('conta os dias até o prazo, negativo depois dele', () => {
    expect(diasAtePrazo('2026-11-04', '2026-11-01')).toBe(6);
    expect(diasAtePrazo('2026-11-10', '2026-11-01')).toBe(0);
    expect(diasAtePrazo('2026-11-12', '2026-11-01')).toBe(-2);
    expect(() => diasAtePrazo('ontem', '2026-11-01')).toThrow(RangeError);
  });
});

describe('formatação', () => {
  it('escreve o mês curto, longo e o nome', () => {
    expect(formatarMesCurto('2026-11-01')).toBe('nov/2026');
    expect(formatarMesLongo('2026-03-01')).toBe('março de 2026');
    expect(nomeDoMes('2026-10-01')).toBe('outubro');
  });

  it('escreve a data com e sem o ano', () => {
    expect(formatarData('2026-10-31')).toBe('31/10/2026');
    expect(formatarData('2026-10-01', true)).toBe('01/10');
    expect(() => formatarData('2026-10')).toThrow(RangeError);
  });
});
