import { describe, expect, it } from 'vitest';

import {
  conferirAprimoramento,
  INSTRUCOES_DO_APRIMORAMENTO,
  montarAprimoramento,
} from './aprimoramento.ts';
import { TRECHOS_VAZIOS } from './evolucao.ts';

const resposta = (conteudo: unknown) => ({
  choices: [
    { message: { content: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo) } },
  ],
});

describe('aprimorar com a IA (E26)', () => {
  it('monta o pedido e confere cada trecho contra o que o coordenador escreveu', () => {
    const pedido = montarAprimoramento('modelo', {
      tratamento: 'a assistida',
      trechos: { ...TRECHOS_VAZIOS, abertura: 'Ela veio em 8 sessões.' },
      programas: ['Comunicação funcional'],
      termos: [{ termo: 'birra', substituto: 'comportamento disruptivo' }],
      orientacoes: [
        { campo: 'abertura', texto: 'Cite a frequência.' },
        { campo: 'metas_do_mes', texto: 'Fica de fora.' },
      ],
    });
    expect(pedido.messages[0]?.content).toContain('- abertura: Cite a frequência.');
    expect(pedido.messages[0]?.content).not.toContain('Fica de fora.');
    expect(pedido.messages[1]?.content).toContain('- Comunicação funcional');
    expect(pedido.messages[1]?.content).toContain('birra → comportamento disruptivo');
    expect(pedido.messages[1]?.content).toContain('abertura: Ela veio em 8 sessões.');
    expect(
      montarAprimoramento('m', {
        tratamento: 'o assistido',
        trechos: TRECHOS_VAZIOS,
        programas: [],
        termos: [],
        orientacoes: [],
      }).messages[0]?.content,
    ).toBe(INSTRUCOES_DO_APRIMORAMENTO);

    const original = {
      abertura: 'Veio em 8 sessões.',
      programas: 'Trabalhou cores.',
      comportamentos: 'Fez birra.',
      recursos: 'Usou fichas.',
      fechamento: '',
    };
    expect(
      conferirAprimoramento(
        original,
        resposta({
          abertura: 'O assistido compareceu a 8 sessões.',
          programas: 'Foram trabalhadas 12 cores.',
          comportamentos: '',
          recursos: 'x'.repeat(5001),
          fechamento: 'Fato novo.',
        }),
      ),
    ).toEqual({
      abertura: 'O assistido compareceu a 8 sessões.',
      programas: 'Trabalhou cores.',
      comportamentos: 'Fez birra.',
      recursos: 'Usou fichas.',
      fechamento: '',
    });
    expect(conferirAprimoramento(original, resposta({ abertura: 7 }))?.abertura).toBe(
      'Veio em 8 sessões.',
    );
    expect(conferirAprimoramento(original, resposta('não é JSON'))).toBeNull();
    expect(conferirAprimoramento(original, resposta('"texto"'))).toBeNull();
    expect(conferirAprimoramento(original, { choices: [] })).toBeNull();
    expect(conferirAprimoramento(original, null)).toBeNull();
  });
});
