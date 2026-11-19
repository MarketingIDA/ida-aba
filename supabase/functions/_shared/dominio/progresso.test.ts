import { describe, expect, it } from 'vitest';

import {
  calcularProgresso,
  ehFiltroDoProgresso,
  filtrarProgresso,
  fracaoDaJanela,
  type MetaDoProgresso,
  type PontoDoProgresso,
  semanasDaJanela,
} from './progresso.ts';

const meta = (
  id: number,
  situacao: MetaDoProgresso['situacao'],
  programa: string | null = `Programa ${String(id)}`,
): MetaDoProgresso => ({ id, programa, texto: `Meta fictícia ${String(id)}`, situacao });

const METAS = [
  meta(1, 'desenvolvimento'), // parada no degrau 2
  meta(2, 'desenvolvimento'), // sem registro em outubro
  meta(3, 'alcancada'), // independente em 08/09, na 2ª sessão com nível
  meta(4, 'manutencao'), // independente na 1ª sessão: a mais rápida
  meta(5, 'suspensa'), // independente, mas suspensa: fora da conta
  meta(6, 'desenvolvimento', null), // sem programa
  meta(7, 'desenvolvimento'), // já independente: não está parada
  meta(8, 'desenvolvimento'), // subiu há pouco
  meta(9, 'desenvolvimento'), // trabalhada em outubro, sem nível
];

const ponto = (metaId: number, data: string, nivel: number | null): PontoDoProgresso => ({
  metaId,
  data,
  nivel,
  trecho: 'Trecho fictício.',
});

const PONTOS = [
  ponto(1, '2026-10-01', 2),
  ponto(1, '2026-08-05', 1),
  ponto(1, '2026-08-20', 2),
  ponto(1, '2026-08-21', null),
  ponto(2, '2026-08-10', 3),
  ponto(3, '2026-08-03', 4),
  ponto(3, '2026-09-08', 5),
  ponto(3, '2026-10-06', 5),
  ponto(4, '2026-08-04', 5),
  ponto(5, '2026-08-06', 5),
  ponto(7, '2026-10-02', 5),
  ponto(8, '2026-10-20', 3),
  ponto(8, '2026-10-25', 4),
  ponto(9, '2026-10-10', null),
  ponto(1, '2026-07-30', 5), // fora da janela
];

const PERIODOS = [
  { inicio: '2026-10-01', fim: '2026-10-31', lido: true },
  { inicio: '2026-08-01', fim: '2026-08-31', lido: true },
  { inicio: '2026-09-01', fim: '2026-09-30', lido: false },
];

describe('evolução das metas (E27)', () => {
  it('calcula a escada, a independência, as metas paradas e os destaques', () => {
    const p = calcularProgresso(METAS, PONTOS, PERIODOS);
    if (p === null) throw new Error('sem progresso');
    const de = (id: number) => p.metas.find((x) => x.meta.id === id);

    expect(semanasDaJanela('2026-08-01', '2026-08-17')).toEqual([
      '2026-07-27',
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
    ]);
    expect([p.inicio, p.fim, p.semanas.length, p.periodosLidos]).toEqual([
      '2026-08-01',
      '2026-10-31',
      14,
      2,
    ]);
    expect(de(1)).toMatchObject({ parada: 10, sumiu: false, atencao: true, semNivel: 1 });
    expect(de(1)?.pontos.map((x) => x.data)).toEqual([
      '2026-08-05',
      '2026-08-20',
      '2026-08-21',
      '2026-10-01',
    ]);
    expect(de(2)).toMatchObject({ sumiu: true, parada: 0, atencao: true });
    expect(de(3)).toMatchObject({ sessoesAteIndependente: 2, atencao: false });
    expect(de(3)?.semanas[6]).toEqual({ sessoes: 1, niveis: [5], independente: true });
    expect(de(6)).toMatchObject({ sumiu: false, pontos: [], primeiro: null });
    expect([de(7)?.parada, de(8)?.parada, de(9)?.parada, de(9)?.sumiu]).toEqual([0, 0, 0, false]);
    expect([p.ativas, p.independentes, p.dias]).toEqual([7, 3, 12]);
    expect(p.porSemana.slice(0, 3)).toEqual([0, 1, 1]);
    expect(p.porSemana.at(-1)).toBe(3);
    expect(p.contagem).toEqual({ desenvolvimento: 6, alcancada: 1, manutencao: 1, atencao: 2 });
    expect([
      p.destaques.rapida?.meta.id,
      p.destaques.parada?.meta.id,
      p.destaques.sumiu?.meta.id,
    ]).toEqual([4, 1, 2]);

    expect(filtrarProgresso(p.metas, 'atencao').map((x) => x.meta.id)).toEqual([1, 2]);
    expect(filtrarProgresso(p.metas, 'alcancada').map((x) => x.meta.id)).toEqual([3]);
    expect(filtrarProgresso(p.metas, null).map((x) => x.meta.id)).toEqual([
      1, 2, 8, 6, 7, 9, 4, 3, 5,
    ]);
    expect([
      ehFiltroDoProgresso('atencao'),
      ehFiltroDoProgresso('outra'),
      ehFiltroDoProgresso(null),
    ]).toEqual([true, false, false]);
  });

  it('sem leitura no último período, nada sumiu nem parou; sem período, não há janela', () => {
    const naoLido = PERIODOS.map((x) => ({ ...x, lido: x.inicio !== '2026-10-01' }));
    const p = calcularProgresso(METAS, PONTOS, naoLido);
    expect(p?.contagem.atencao).toBe(0);
    expect(calcularProgresso(METAS, PONTOS, [])).toBeNull();
    expect([
      fracaoDaJanela('2026-08-16', '2026-08-01', '2026-08-31'),
      fracaoDaJanela('2026-07-01', '2026-08-01', '2026-08-31'),
      fracaoDaJanela('2026-09-30', '2026-08-01', '2026-08-31'),
      fracaoDaJanela('2026-08-01', '2026-08-01', '2026-08-01'),
    ]).toEqual([0.5, 0, 1, 0]);
  });
});
