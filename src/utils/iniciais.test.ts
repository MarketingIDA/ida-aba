import { describe, expect, it } from 'vitest';

import { iniciais } from './iniciais';

describe('iniciais', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Ana Beatriz Lima')).toBe('AL');
    expect(iniciais('  bruno   costa ')).toBe('BC');
  });

  it('com um nome só, usa uma letra', () => {
    expect(iniciais('Clara')).toBe('C');
    expect(iniciais('')).toBe('');
  });
});
