import { describe, expect, it } from 'vitest';

import { linhasDoTexto, metasDoTexto, TRECHOS_VAZIOS } from './evolucao.ts';

describe('linhas do texto da evolução (E10)', () => {
  it('une os trechos preenchidos por um espaço e conta 95 caracteres por linha, como o banco', () => {
    // 285 + 1 (o espaço) + 285 = 571 caracteres: passa de 6 linhas (570) e conta 7.
    const trecho = 'a'.repeat(285);
    const sete = { ...TRECHOS_VAZIOS, abertura: ` ${trecho} `, recursos: trecho, programas: '  ' };
    expect(linhasDoTexto(sete)).toBe(7);
    expect(linhasDoTexto({ ...sete, recursos: trecho.slice(1) })).toBe(6);
    expect(linhasDoTexto(TRECHOS_VAZIOS)).toBe(0);
  });

  it('metas: uma por linha, sem as linhas em branco', () => {
    expect(metasDoTexto(' Meta um \n\n  \nMeta dois\n')).toEqual(['Meta um', 'Meta dois']);
  });
});
