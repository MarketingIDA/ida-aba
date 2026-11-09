import { describe, expect, it } from 'vitest';

import {
  carteiraUnica,
  contarPorSituacao,
  ehSituacao,
  filtrarLista,
  normalizar,
  plural,
  recortar,
  textoDoPrazo,
} from '@/features/evolucoes/logica';
import { linhaDoMes } from '@/testing/factories/evolucoes';

const linhas = [
  linhaDoMes({ assistidoId: 1, nome: 'Davi Souza' }),
  linhaDoMes({ assistidoId: 2, nome: 'Ana Lima', situacao: 'enviada' }),
  linhaDoMes({ assistidoId: 3, nome: 'Caio Melo', situacao: 'em_conferencia' }),
  linhaDoMes({ assistidoId: 4, nome: 'Bia Rocha', situacao: 'concluida', unidadeSigla: 'UNB' }),
  linhaDoMes({ assistidoId: 5, nome: 'Érica Dias', coordenadorId: 9 }),
];

describe('contagem e recorte', () => {
  it('conta cada situação, com "sem evolução" para quem não tem', () => {
    expect(contarPorSituacao(linhas)).toEqual({
      sem: 2,
      em_conferencia: 1,
      concluida: 1,
      enviada: 1,
    });
  });

  it('recorta por unidade e por coordenador', () => {
    expect(recortar(linhas, { unidade: 'UNB', coordenadorId: null })).toHaveLength(1);
    expect(recortar(linhas, { unidade: null, coordenadorId: 9 })).toHaveLength(1);
    expect(recortar(linhas, { unidade: null, coordenadorId: null })).toHaveLength(5);
  });

  it('reconhece só as situações da tela', () => {
    expect(ehSituacao('concluida')).toBe(true);
    expect(ehSituacao('outra')).toBe(false);
    expect(ehSituacao(null)).toBe(false);
  });
});

describe('lista', () => {
  it('põe em conferência primeiro, depois sem evolução, concluídas e enviadas', () => {
    expect(filtrarLista(linhas, null, '').map((l) => l.nome)).toEqual([
      'Caio Melo',
      'Davi Souza',
      'Érica Dias',
      'Bia Rocha',
      'Ana Lima',
    ]);
  });

  it('filtra pela situação e busca nome sem acento ou código', () => {
    expect(filtrarLista(linhas, 'sem', '').map((l) => l.nome)).toEqual([
      'Davi Souza',
      'Érica Dias',
    ]);
    expect(filtrarLista(linhas, null, 'erica').map((l) => l.nome)).toEqual(['Érica Dias']);
    const codigo = linhas[2]?.evolucao?.codigo ?? '';
    expect(filtrarLista(linhas, null, codigo.toLowerCase()).map((l) => l.nome)).toEqual([
      'Caio Melo',
    ]);
  });

  it('normaliza acento, caixa e espaço', () => {
    expect(normalizar('  JOÃO Ávila ')).toBe('joao avila');
  });
});

describe('textos', () => {
  it('descreve a carteira só quando ela é uma unidade e um turno', () => {
    expect(carteiraUnica([])).toBeNull();
    expect(carteiraUnica(linhas)).toBeNull();
    expect(carteiraUnica(linhas.slice(0, 3))).toEqual({
      unidadeNome: 'Unidade Fictícia',
      turno: 'manha',
    });
  });

  it('escreve o prazo antes, no dia e depois', () => {
    expect(textoDoPrazo(6)).toBe('faltam 6 dias');
    expect(textoDoPrazo(1)).toBe('falta 1 dia');
    expect(textoDoPrazo(0)).toBe('o prazo é hoje');
    expect(textoDoPrazo(-1)).toBe('o prazo passou há 1 dia');
    expect(textoDoPrazo(-3)).toBe('o prazo passou há 3 dias');
  });

  it('flexiona o plural', () => {
    expect(plural(1, 'evolução', 'evoluções')).toBe('1 evolução');
    expect(plural(4, 'evolução', 'evoluções')).toBe('4 evoluções');
  });
});
