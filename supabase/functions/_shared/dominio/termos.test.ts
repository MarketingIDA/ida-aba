import { describe, expect, it } from 'vitest';

import { TRECHOS_VAZIOS } from './evolucao.ts';
import {
  marcarTermos,
  normalizarTermo,
  termosNoTexto,
  trocarNosTrechos,
  trocarTermo,
} from './termos.ts';

const BIRRA = { termo: 'birra', substituto: 'episódio de desregulação emocional' };
const AGRESSAO = { termo: 'agressao', substituto: 'comportamento inadequado' };
const COMPORTAMENTO = { termo: 'Comportamento  Agressivo', substituto: 'comportamento inadequado' };
const AGRESSIVO = { termo: 'agressivo', substituto: 'inadequado' };
const LISTA = [BIRRA, AGRESSAO, AGRESSIVO, COMPORTAMENTO];

describe('normalizarTermo', () => {
  it('tira acento, maiúscula e espaço a mais', () => {
    expect(normalizarTermo('  Comportamento   AGRESSÃO ')).toBe('comportamento agressao');
  });
});

describe('termosNoTexto', () => {
  it('acha o termo como palavra inteira, sem ligar para maiúscula nem acento', () => {
    expect(termosNoTexto('Fez Birra na roda e houve agressão.', LISTA)).toEqual([AGRESSAO, BIRRA]);
    expect(termosNoTexto('Usou a birrazinha e o embirrado.', LISTA)).toEqual([]);
  });

  it('o trecho já achado pelo termo mais longo não conta para o menor', () => {
    expect(termosNoTexto('Teve comportamento\nagressivo na sala.', LISTA)).toEqual([COMPORTAMENTO]);
    expect(termosNoTexto('Foi agressivo. Teve comportamento agressivo.', LISTA)).toEqual([
      COMPORTAMENTO,
      AGRESSIVO,
    ]);
  });

  it('termo com sinal de expressão regular vale como texto', () => {
    const sinal = { termo: 'crise (surto)', substituto: 'episódio de desregulação' };
    expect(termosNoTexto('Teve uma crise (surto) no dia 3.', [sinal])).toEqual([sinal]);
    expect(termosNoTexto('Teve uma crise surto no dia 3.', [sinal])).toEqual([]);
  });
});

describe('marcarTermos', () => {
  it('devolve o texto em pedaços, com os termos marcados', () => {
    expect(marcarTermos('Fez birra e teve comportamento agressivo', LISTA)).toEqual([
      { texto: 'Fez ', marcado: false },
      { texto: 'birra', marcado: true },
      { texto: ' e teve ', marcado: false },
      { texto: 'comportamento agressivo', marcado: true },
    ]);
  });

  it('sem lista, o texto vem inteiro e sem marca', () => {
    expect(marcarTermos('Fez birra.', [])).toEqual([{ texto: 'Fez birra.', marcado: false }]);
  });
});

describe('trocarTermo', () => {
  it('troca todas as vezes e mantém a maiúscula do começo de frase', () => {
    expect(trocarTermo('Birra na chegada. Depois, outra birra.', BIRRA)).toBe(
      'Episódio de desregulação emocional na chegada. Depois, outra episódio de desregulação emocional.',
    );
  });

  it('o substituto entra como está, mesmo com cifrão', () => {
    expect(trocarTermo('Fez birra.', { termo: 'birra', substituto: 'R$& 1' })).toBe('Fez R$& 1.');
  });
});

describe('trocarNosTrechos', () => {
  it('troca o termo nos 5 trechos e deixa o resto como está', () => {
    const trechos = { ...TRECHOS_VAZIOS, abertura: 'Fez birra.', fechamento: 'Sem BIRRA no fim.' };
    expect(trocarNosTrechos(trechos, BIRRA)).toEqual({
      ...TRECHOS_VAZIOS,
      abertura: 'Fez episódio de desregulação emocional.',
      fechamento: 'Sem Episódio de desregulação emocional no fim.',
    });
  });
});
