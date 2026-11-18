import { describe, expect, it } from 'vitest';

import { conferirDocumento, datasDoTexto, situacaoDaData, tipoDoTexto } from './documentos.ts';

const ASSISTIDA = { nome: 'Maria Clara Souza', genero: 'feminino' } as const;

describe('conferência dos outros documentos (E25)', () => {
  it('tira o nome, conta as trocas e sugere a data mais recente até hoje e o tipo', () => {
    const conferido = conferirDocumento(
      {
        arquivo: 'Relatorio escolar.pdf',
        paginas: 2,
        texto:
          'Relatório escolar  \n\n\n\nMaria Clara Souza nasceu em 03/04/2019.\nNa sala de aula, Maria participa.\nRecife, 15 de outubro de 2026. Próxima reunião: 10/12/2026.',
      },
      ASSISTIDA,
      '2026-11-18',
    );
    expect(conferido).toMatchObject({
      texto:
        'Relatório escolar\n\na assistida nasceu em 03/04/2019.\nNa sala de aula, a assistida participa.\nRecife, 15 de outubro de 2026. Próxima reunião: 10/12/2026.',
      trocas: 2,
      cortado: false,
      dataSugerida: '2026-10-15',
      tipoSugerido: 'escola',
    });
  });

  it('sem o nome nem data, o documento pede confirmação e entra como contexto', () => {
    const conferido = conferirDocumento(
      { arquivo: 'bilhete.docx', paginas: null, texto: 'Ele dormiu mal na semana.' },
      ASSISTIDA,
      '2026-11-18',
    );
    expect(conferido.trocas).toBe(0);
    expect(conferido.dataSugerida).toBeNull();
    expect(situacaoDaData(conferido.dataSugerida, '2026-11-01')).toBe('sem_data');
    expect(situacaoDaData('2026-10-31', '2026-11-01')).toBe('no_periodo');
    expect(situacaoDaData('2026-09-30', '2026-11-01')).toBe('fora_do_periodo');
    // Data que não existe e mês que não é mês ficam de fora.
    expect(datasDoTexto('31/02/2026, 05-10-26, 3 de cada de 2026, 1º de março de 2026')).toEqual([
      '2026-10-05',
      '2026-03-01',
    ]);
    expect(
      [
        'PEI do semestre',
        'Relatório da fonoaudiologia',
        'Avaliação VB-MAPP',
        'A mãe contou',
        'Bilhete',
      ].map((texto) => tipoDoTexto(texto)),
    ).toEqual(['pei', 'terapia', 'avaliacao', 'familia', 'outro']);
  });
});
