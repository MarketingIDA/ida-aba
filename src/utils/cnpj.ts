/**
 * CNPJ numérico ou alfanumérico (o da Receita, desde julho de 2026): 12 caracteres (números ou
 * letras maiúsculas) e 2 dígitos verificadores. O banco confere o mesmo cálculo
 * (`interno.cnpj_valido`) e guarda sem pontuação.
 */
const PESOS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Tira pontos, barra, traço e espaços e põe as letras em maiúsculas: `12.345.678/0001-95` → `12345678000195`. */
export const normalizarCnpj = (texto: string) => texto.replace(/[\s./-]/g, '').toUpperCase();

/** Cada caractere vale o código menos 48: 0 a 9 para os números, 17 a 42 para A a Z. */
function digito(base: string): number {
  const inicio = PESOS.length - base.length;
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += (base.charCodeAt(i) - 48) * (PESOS[inicio + i] ?? 0);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Recebe o CNPJ já normalizado. Recusa o formato errado, os dígitos que não batem e `000…0`. */
export function cnpjValido(cnpj: string): boolean {
  if (!/^[\dA-Z]{12}\d{2}$/.test(cnpj) || /^(.)\1+$/.test(cnpj)) return false;
  const primeiro = digito(cnpj.slice(0, 12));
  const segundo = digito(cnpj.slice(0, 12) + String(primeiro));
  return cnpj.slice(12) === `${String(primeiro)}${String(segundo)}`;
}

/** `12345678000195` → `12.345.678/0001-95`. */
export const formatarCnpj = (cnpj: string) =>
  `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
