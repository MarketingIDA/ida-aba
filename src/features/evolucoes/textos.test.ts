import { describe, expect, it } from 'vitest';

import {
  deQuemEALista,
  nomeCurto,
  opcoesDeCoordenador,
  opcoesDeUnidade,
  periodoEPrazo,
} from '@/features/evolucoes/textos';
import {
  carteiraDemo,
  coordenadoresDemo,
  linhaDoMes,
  unidadesDemo,
} from '@/testing/factories/evolucoes';

describe('subtítulo', () => {
  it('diz de quem é a lista', () => {
    expect(deQuemEALista(true, [])).toBe('Todas as unidades. ');
    expect(deQuemEALista(false, [])).toBe('');
    expect(deQuemEALista(false, unidadesDemo())).toBe('');
    expect(deQuemEALista(false, [linhaDoMes({ turno: 'integral' })])).toBe(
      'Sua carteira em Unidade Fictícia, turno integral. ',
    );
  });

  it('no mês aberto conta quanto falta; num mês passado diz qual foi o prazo', () => {
    expect(periodoEPrazo('2026-11-01', '2026-11-01', '2026-11-11')).toBe(
      'Sessões de 01/10 a 31/10/2026; o arquivo do mês vai a contas médicas até 10/11 (o prazo passou há 1 dia).',
    );
    expect(periodoEPrazo('2026-10-01', '2026-11-01', '2026-11-04')).toBe(
      'Evoluções de outubro. Sessões de 01/09 a 30/09/2026; o prazo do arquivo do mês foi 10/10.',
    );
  });

  it('encurta o nome para o primeiro e o último', () => {
    expect(nomeCurto('Carla Fictícia Coordenadora')).toBe('Carla Coordenadora');
    expect(nomeCurto(' Carla ')).toBe('Carla');
  });
});

describe('opções do recorte', () => {
  it('lista as unidades presentes, em ordem de sigla', () => {
    expect(opcoesDeUnidade(unidadesDemo())).toEqual([
      { valor: 'UNA', rotulo: 'UNA · Unidade Fictícia' },
      { valor: 'UNB', rotulo: 'UNB · Outra Unidade Fictícia' },
    ]);
  });

  it('lista só os coordenadores com carteira na lista ou na unidade escolhida', () => {
    expect(opcoesDeCoordenador(unidadesDemo(), coordenadoresDemo(), null)).toEqual([
      { valor: '2', rotulo: 'Carla Fictícia Coordenadora · UNA manhã' },
      { valor: '7', rotulo: 'Gil Fictício Coordenador · UNB tarde' },
    ]);
    expect(opcoesDeCoordenador(unidadesDemo(), coordenadoresDemo(), 'UNB')).toHaveLength(1);
    expect(opcoesDeCoordenador(carteiraDemo(), coordenadoresDemo(), null)).toHaveLength(1);
  });
});
