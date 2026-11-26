import { describe, expect, it } from 'vitest';

import { conferirLeitura, lerRelatorio } from '@/features/evolucoes/tita/leitura';

/** Uma evolução diária do relatório, com os rótulos do Tita. Todo o conteúdo é fictício. */
const diaria = (data: string, analise: string[]) => [
  'Dados da Evolução Diária:',
  `Data: ${data}`,
  'Horário: 14:00 - 15:00',
  'Local: Sala Fictícia ABA',
  'Terapia: ABA',
  'Profissional: Paula Fictícia',
  'S O A P',
  'SUBJETIVO',
  'Sentimentos',
  'Tranquilo',
  'AVALIAÇÃO',
  'Alcance',
  '0 % Valor gerado automaticamente',
  'Habilidades Trabalhadas',
  'Sem dados cadastrados',
  'Análise do Atendimento',
  ...analise,
  'Fatores de Impacto',
  'Sem dados cadastrados',
  'PLANEJAMENTO',
  'Considerações para o próximo atendimento',
  'Seguir com o planejamento.',
];

/** O relatório como o leitor de PDF entrega: linha a linha, com sobras de cabeçalho no meio. */
const RELATORIO = [
  'Dados do Favorecido',
  'Nome: Alice Fictícia Moura',
  'Idade: 6 anos, 2 meses e 10 dias',
  'Gênero: Feminino',
  'Terapias: ABA.',
  'Profissionais: Paula Fictícia.',
  'Período avaliado: 01/10/2026 - 31/10/2026',
  'Filtros Aplicados:',
  'Profissional: Todos',
  'Favorecido: Alice Fictícia Moura',
  'Terapia: ABA',
  'Total de Evoluções Diárias: 4',
  'Habilidades trabalhadas no periodo',
  ...diaria('05/10/26', [
    'A assistida chegou bem e seguiu a rotina',
    'Relatório de Evoluções Diárias',
    'Periodo: 01/10/2026 a 31/10/2026 Terapia: ABA Profissional: Todos Favorecido: Alice Fictícia Moura',
    'da sessão, com dica verbal.',
  ]),
  ...diaria('07/10/26', ['A assistida não compareceu à sessão.']),
  ...diaria('15/10/26', ['Sessão realizada em 15/09, com boa participação.']),
  ...diaria('30/09/26', ['Registro do mês anterior.']),
];

describe('Leitura do PDF do Tita', () => {
  it('lê os Dados do Favorecido e só a análise de cada evolução diária, sem as sobras de página', () => {
    const leitura = lerRelatorio(RELATORIO);

    expect(leitura?.favorecido).toMatchObject({
      nome: 'Alice Fictícia Moura',
      terapias: 'ABA',
      periodoInicio: '2026-10-01',
      periodoFim: '2026-10-31',
      filtroProfissional: 'Todos',
      filtroTerapia: 'ABA',
      total: 4,
    });
    expect(leitura?.analises).toEqual([
      {
        data: '2026-10-05',
        texto: 'A assistida chegou bem e seguiu a rotina da sessão, com dica verbal.',
        falta: false,
      },
      { data: '2026-10-07', texto: 'A assistida não compareceu à sessão.', falta: true },
      {
        data: '2026-10-15',
        texto: 'Sessão realizada em 15/09, com boa participação.',
        falta: false,
      },
      { data: '2026-09-30', texto: 'Registro do mês anterior.', falta: false },
    ]);
    expect(lerRelatorio(['Um PDF qualquer', 'sem os rótulos do Tita'])).toBeNull();
  });

  it('bloqueia o PDF de outro assistido, de outro período ou com filtro, e alerta as datas (E03, E19)', () => {
    const leitura = lerRelatorio(RELATORIO);
    if (leitura === null) throw new Error('o relatório fictício tem de ser lido');

    const certa = conferirLeitura(leitura, 'ALICE  ficticia Moura', '2026-11-01');
    expect(certa.bloqueios).toEqual([]);
    expect(certa.noPeriodo.map((a) => a.data)).toEqual(['2026-10-05', '2026-10-07', '2026-10-15']);
    expect(certa.alertas).toEqual([
      'Ficaram de fora, por terem data fora do período: 30/09.',
      'A análise cita uma data diferente da data do registro em: 15/10. Confira no Tita.',
    ]);

    const errada = conferirLeitura(
      { ...leitura, favorecido: { ...leitura.favorecido, filtroProfissional: 'Paula Fictícia' } },
      'Bento Fictício Prado',
      '2026-12-01',
    );
    expect(errada.bloqueios).toHaveLength(4);
    expect(errada.bloqueios[0]).toBe(
      'O PDF é de Alice Fictícia Moura, não de Bento Fictício Prado.',
    );
  });

  it('aceita a terapia escrita "Terapia ABA" e, sem filtro, o favorecido só com ABA', () => {
    const leitura = lerRelatorio(RELATORIO);
    if (leitura === null) throw new Error('o relatório fictício tem de ser lido');
    const comTerapia = (filtroTerapia: string, terapias: string) =>
      conferirLeitura(
        { ...leitura, favorecido: { ...leitura.favorecido, filtroTerapia, terapias } },
        'Alice Fictícia Moura',
        '2026-11-01',
      ).bloqueios;

    expect(comTerapia('Terapia ABA', 'Terapia ABA')).toEqual([]);
    expect(comTerapia('', 'Terapia ABA')).toEqual([]);
    expect(comTerapia('Fonoaudiologia', 'Terapia ABA')).toEqual([
      'O PDF não é da terapia ABA. Exporte no Tita com a terapia ABA.',
    ]);
  });
});
