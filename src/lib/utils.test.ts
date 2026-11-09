import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('junta classes e ignora valores falsos', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });

  it('resolve conflito do Tailwind ficando com a última classe', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('os tamanhos de fonte do tema não apagam a cor do texto', () => {
    expect(cn('bg-azul text-white', 'text-caption')).toBe('bg-azul text-white text-caption');
    expect(cn('text-2xs text-white', 'text-kpi')).toBe('text-white text-kpi');
  });

  it('aceita objeto condicional', () => {
    expect(cn('a', { b: true, c: false })).toBe('a b');
  });
});
