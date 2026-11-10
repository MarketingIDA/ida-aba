import { describe, expect, it } from 'vitest';

import { cnpjValido, formatarCnpj, normalizarCnpj } from './cnpj';

// CNPJs fictícios: só os dígitos verificadores batem. O alfanumérico é o exemplo da Receita.
describe('CNPJ', () => {
  it('aceita o numérico e o alfanumérico, com ou sem pontuação, e formata de volta', () => {
    expect(normalizarCnpj(' 12.345.678/0001-95 ')).toBe('12345678000195');
    expect(cnpjValido(normalizarCnpj('12.345.678/0001-95'))).toBe(true);
    expect(cnpjValido(normalizarCnpj('12.abc.345/01de-35'))).toBe(true);
    expect(formatarCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });

  it.each([
    '12345678000196',
    '12345678000159',
    '1234567800019',
    '00000000000000',
    '12ABC34501DE3A',
  ])('recusa %s', (cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false);
  });
});
