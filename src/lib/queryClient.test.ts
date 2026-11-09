import { describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/lib/queryClient';

const comStatus = (status: unknown) => Object.assign(new Error('x'), { status });

describe('queryClient', () => {
  it('tem staleTime explícito e mutations sem retry', () => {
    const opcoes = queryClient.getDefaultOptions();
    expect(opcoes.queries?.staleTime).toBe(60_000);
    expect(opcoes.mutations?.retry).toBe(0);
  });

  it('repete até 3 vezes só erro que não é 4xx', () => {
    const { retry } = queryClient.getDefaultOptions().queries ?? {};
    if (typeof retry !== 'function') throw new Error('retry deveria ser função');
    expect(retry(0, comStatus(500))).toBe(true);
    expect(retry(2, comStatus(503))).toBe(true);
    expect(retry(3, comStatus(500))).toBe(false);
    expect(retry(0, comStatus(401))).toBe(false);
    expect(retry(0, comStatus(404))).toBe(false);
    expect(retry(0, comStatus('400'))).toBe(true);
    expect(retry(0, new Error('sem status'))).toBe(true);
  });

  it('registra erro de query e de mutation pelo logger, sem a mensagem', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const padrao = queryClient.getDefaultOptions();
    queryClient.setDefaultOptions({ ...padrao, queries: { ...padrao.queries, retry: false } });

    await expect(
      queryClient.query({ queryKey: ['x'], queryFn: () => Promise.reject(new Error('segredo')) }),
    ).rejects.toThrow('segredo');
    await expect(
      queryClient
        .getMutationCache()
        .build(queryClient, { mutationFn: () => Promise.reject(new Error('segredo')) })
        .execute(undefined),
    ).rejects.toThrow('segredo');

    expect(error).toHaveBeenCalledTimes(2);
    expect(String(error.mock.calls)).toContain('query falhou');
    expect(String(error.mock.calls)).toContain('mutation falhou');
    expect(String(error.mock.calls)).not.toContain('segredo');
  });
});
