import { describe, expect, it } from 'vitest';

import { marcadaComoManutencao, metaJaAlcancada, normalizarMeta } from './metas.ts';

describe('metas da evolução e do cadastro (E12, E23)', () => {
  it('normaliza como o banco', () => {
    expect(normalizarMeta('  - Imitar   três ações com OBJETO. ')).toBe(
      'imitar tres acoes com objeto',
    );
    expect(normalizarMeta('Imitar três ações com objeto (manutenção)')).toBe(
      'imitar tres acoes com objeto',
    );
    expect(normalizarMeta('• Parear figuras;')).toBe('parear figuras');
    expect(normalizarMeta('Nomear . ; ')).toBe('nomear');
    expect(normalizarMeta(' .; ')).toBe('');
    expect(marcadaComoManutencao('Ação (Manutenção).')).toBe(true);
    expect(marcadaComoManutencao('Ação')).toBe(false);
  });

  it('acha a meta para o mês atual que já foi alcançada', () => {
    const alcancadas = ['Parear figuras iguais.', '  '];
    expect(metaJaAlcancada(['Nomear cores', 'parear FIGURAS iguais'], alcancadas)).toBe(
      'parear FIGURAS iguais',
    );
    expect(metaJaAlcancada(['Nomear cores', ''], alcancadas)).toBeNull();
  });
});
