import { describe, expect, it } from 'vitest';

import { cnpjValido, normalizarCnpj } from './cnpj';

// CNPJs fictícios: só os dígitos verificadores batem. O alfanumérico é o exemplo da Receita.
describe('CNPJ', () => {
  it('confere os dígitos do numérico e do alfanumérico', () => {
    expect(cnpjValido(normalizarCnpj('12.345.678/0001-95'))).toBe(true);
    expect(cnpjValido(normalizarCnpj('12.abc.345/01de-35'))).toBe(true);
    expect(cnpjValido('12345678000196')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });
});
