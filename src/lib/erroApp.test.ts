import { describe, expect, it } from 'vitest';

import { ehErroApp, ErroApp } from '@/lib/erroApp';

describe('ErroApp', () => {
  it('guarda código, mensagem e a causa original', () => {
    const causa = new Error('original');
    const erro = new ErroApp('sem_acesso', 'Sem acesso.', causa);
    expect(erro.codigo).toBe('sem_acesso');
    expect(erro.message).toBe('Sem acesso.');
    expect(erro.cause).toBe(causa);
    expect(erro.name).toBe('ErroApp');
  });

  it('aceita não ter causa', () => {
    expect(new ErroApp('x', 'y').cause).toBeUndefined();
  });

  it('ehErroApp distingue de outros erros', () => {
    expect(ehErroApp(new ErroApp('x', 'y'))).toBe(true);
    expect(ehErroApp(new Error('y'))).toBe(false);
  });
});
