import { describe, expect, it } from 'vitest';

import { erroDoBanco } from '@/lib/erroDoBanco';

describe('erroDoBanco', () => {
  it('usa a mensagem da tabela quando ela existe', () => {
    const erro = erroDoBanco(
      { code: '23505' },
      { duplicado: 'Já existe uma terapia com este código.' },
    );
    expect(erro.codigo).toBe('duplicado');
    expect(erro.message).toBe('Já existe uma terapia com este código.');
  });

  it('cai na mensagem genérica de cada código', () => {
    expect(erroDoBanco({ code: '23514' }).codigo).toBe('regra_violada');
    expect(erroDoBanco({ code: '42501' }).message).toBe(
      'Você não tem permissão para esta alteração.',
    );
    expect(erroDoBanco({ code: 'PGRST116' }).codigo).toBe('sem_permissao');
  });

  it('código desconhecido ou ausente vira "indisponível", com o erro original na causa', () => {
    const original = { code: '08006' };
    const erro = erroDoBanco(original);
    expect(erro.codigo).toBe('indisponivel');
    expect(erro.cause).toBe(original);
    expect(erroDoBanco({}).codigo).toBe('indisponivel');
  });
});
