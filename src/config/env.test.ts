import { describe, expect, it } from 'vitest';

import { env, lerEnv } from '@/config/env';

const valido = {
  VITE_SUPABASE_URL: 'https://projeto.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_exemplo',
};

describe('lerEnv', () => {
  it('devolve as variáveis públicas validadas, sem o prefixo VITE_', () => {
    expect(lerEnv({ ...valido, MODE: 'test', DEV: false })).toEqual({
      SUPABASE_URL: 'https://projeto.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_exemplo',
    });
  });

  it('falha no boot listando os NOMES das variáveis ausentes', () => {
    expect(() => lerEnv({})).toThrow(/VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('recusa URL que não seja http(s) sem repetir o valor na mensagem', () => {
    const segredo = 'file://nao-deve-aparecer.exemplo';
    let mensagem = '';
    try {
      lerEnv({ ...valido, VITE_SUPABASE_URL: segredo });
    } catch (erro) {
      mensagem = erro instanceof Error ? erro.message : '';
    }
    expect(mensagem).toContain('VITE_SUPABASE_URL');
    expect(mensagem).not.toContain(segredo);
  });

  it('recusa chave publicável vazia', () => {
    expect(() => lerEnv({ ...valido, VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY/,
    );
  });
});

describe('env', () => {
  it('é montado na importação a partir do ambiente de teste', () => {
    expect(env.SUPABASE_URL).toBe('https://exemplo.supabase.co');
  });
});
