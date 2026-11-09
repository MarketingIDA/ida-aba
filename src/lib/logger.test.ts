import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/logger';

const silenciar = (nivel: 'info' | 'warn' | 'error') =>
  vi.spyOn(console, nivel).mockImplementation(() => undefined);

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escreve JSON com nível, mensagem e o erro reduzido ao nome, sem a mensagem dele', () => {
    const error = silenciar('error');
    logger.error('query falhou', new RangeError('contém o e-mail x@y.z'));
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({ nivel: 'error', mensagem: 'query falhou', erro: { nome: 'RangeError' } }),
    );
  });

  it('inclui o código quando o erro tem um', () => {
    const warn = silenciar('warn');
    logger.warn('aviso', Object.assign(new Error('x'), { code: 'PGRST116' }));
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        nivel: 'warn',
        mensagem: 'aviso',
        erro: { nome: 'Error', codigo: 'PGRST116' },
      }),
    );
  });

  it('descreve só o tipo de algo que não é Error', () => {
    const warn = silenciar('warn');
    logger.warn('aviso', 'texto');
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({ nivel: 'warn', mensagem: 'aviso', erro: { nome: 'string' } }),
    );
  });

  it('info e warn sem erro escrevem só a mensagem', () => {
    const info = silenciar('info');
    const warn = silenciar('warn');
    logger.info('oi');
    logger.warn('cuidado');
    expect(info).toHaveBeenCalledWith(JSON.stringify({ nivel: 'info', mensagem: 'oi' }));
    expect(warn).toHaveBeenCalledWith(JSON.stringify({ nivel: 'warn', mensagem: 'cuidado' }));
  });
});
