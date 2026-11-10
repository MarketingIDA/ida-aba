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

  it('regra do banco com `hint` conhecido ganha a mensagem própria', () => {
    const mensagens = {
      regra_violada: 'Regra da tabela.',
      regras: { ultima_coordenacao_geral: 'Precisa de uma coordenação geral ativa.' },
    };
    const erro = erroDoBanco({ code: '23514', hint: 'ultima_coordenacao_geral' }, mensagens);
    expect(erro.codigo).toBe('regra_violada');
    expect(erro.message).toBe('Precisa de uma coordenação geral ativa.');
    // `hint` desconhecido, nulo ou herdado do protótipo cai na mensagem da tabela.
    expect(erroDoBanco({ code: '23514', hint: 'outra' }, mensagens).message).toBe(
      'Regra da tabela.',
    );
    expect(erroDoBanco({ code: '23514', hint: null }, mensagens).message).toBe('Regra da tabela.');
    expect(erroDoBanco({ code: '23514', hint: 'toString' }, mensagens).message).toBe(
      'Regra da tabela.',
    );
    // O `hint` só vale para regra: num duplicado, manda a mensagem do duplicado.
    expect(erroDoBanco({ code: '23505', hint: 'ultima_coordenacao_geral' }, mensagens).codigo).toBe(
      'duplicado',
    );
  });

  it('código desconhecido ou ausente vira "indisponível", com o erro original na causa', () => {
    const original = { code: '08006' };
    const erro = erroDoBanco(original);
    expect(erro.codigo).toBe('indisponivel');
    expect(erro.cause).toBe(original);
    expect(erroDoBanco({}).codigo).toBe('indisponivel');
  });
});
