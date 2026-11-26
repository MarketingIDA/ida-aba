import { describe, expect, it } from 'vitest';

import { MAXIMO_DA_META } from './evolucao.ts';
import {
  conteudoDoPedido,
  FORMATO_DO_RASCUNHO,
  INSTRUCOES_DO_RASCUNHO,
  instrucoesDoRascunho,
  lerOrientacoes,
  lerRascunho,
  lerRespostaDaIA,
  montarPedido,
} from './rascunho.ts';

const ORIENTACOES = [
  { campo: 'programas', texto: 'Cite o nível de ajuda de cada programa.' },
  { campo: 'metas_do_mes', texto: 'Escreva cada meta com o verbo no infinitivo.' },
] as const;

const PEDIDO = {
  mesRef: '2026-11-01',
  tratamento: 'a assistida',
  orientacoes: [],
  documentos: [],
  analises: [
    { data: '2026-10-05', texto: 'A assistida seguiu a rotina com dica verbal.', falta: false },
    { data: '2026-10-07', texto: 'A assistida não compareceu.', falta: true },
  ],
};

const frase = (texto: unknown, sessoes: unknown = [1], documentos: unknown = []) => ({
  texto,
  sessoes,
  documentos,
});

const RASCUNHO = {
  abertura: [frase(' Abertura fictícia. ')],
  programas: [frase('Programas fictícios.', [1, 2]), frase('Segunda frase.', [2], [1])],
  comportamentos: [],
  recursos: [frase('  ')],
  fechamento: [frase('Fecho fictício.')],
  metas_alcancadas: [frase(' Meta alcançada '), frase(''), 7],
  metas_do_mes: ['Meta um', 'Meta dois', 'Meta três', 'M'.repeat(MAXIMO_DA_META + 10)].map((m) =>
    frase(m),
  ),
};

const resposta = (content: unknown) => ({ choices: [{ message: { content } }] });

describe('pedido do rascunho à IA', () => {
  it('a partir de 75%, a frequência não vai para a IA (E04)', () => {
    const conteudo = conteudoDoPedido({
      ...PEDIDO,
      analises: PEDIDO.analises.map((a) => ({ ...a, falta: false })),
    });
    expect(conteudo).not.toContain('Frequência');
  });

  it('na escrita à mão, sem análise, leva só os documentos (E26)', () => {
    const conteudo = conteudoDoPedido({
      ...PEDIDO,
      analises: [],
      documentos: [{ tipo: 'escola', data: '2026-10-20', texto: 'A assistida participa da roda.' }],
    });
    expect(conteudo.split('\n')).toEqual([
      'Evolução de novembro de 2026. Período analisado: 01/10/2026 a 31/10/2026.',
      'Tratamento: a assistida.',
      '',
      'Outros documentos:',
      '[D1, Relatório escolar, 20/10/2026] A assistida participa da roda.',
    ]);
  });

  it('leva o mês, o tratamento, a frequência e as análises, com a falta marcada', () => {
    expect(conteudoDoPedido(PEDIDO)).toBe(
      [
        'Evolução de novembro de 2026. Período analisado: 01/10/2026 a 31/10/2026.',
        'Tratamento: a assistida.',
        'Frequência: 1 sessões realizadas em 2 evoluções diárias (50%).',
        '',
        'Análises do atendimento:',
        '[S1, 05/10] A assistida seguiu a rotina com dica verbal.',
        '[S2, 07/10, falta] A assistida não compareceu.',
      ].join('\n'),
    );
    const comDocumentos = conteudoDoPedido({
      ...PEDIDO,
      documentos: [
        { tipo: 'escola', data: '2026-10-20', texto: 'A assistida participa da roda.' },
        { tipo: 'avaliacao', data: '2026-03-02', texto: 'Avaliação fictícia.' },
        { tipo: 'outro', data: null, texto: 'Bilhete fictício.' },
      ],
    });
    expect(comDocumentos.split('\n').slice(-4)).toEqual([
      'Outros documentos:',
      '[D1, Relatório escolar, 20/10/2026] A assistida participa da roda.',
      '[D2, Avaliação, 02/03/2026, contexto] Avaliação fictícia.',
      '[D3, Outro, sem data, contexto] Bilhete fictício.',
    ]);
    const comPlano = conteudoDoPedido({
      ...PEDIDO,
      metas: { emDesenvolvimento: ['Nomear cores fictícias'], jaAlcancadas: [] },
    });
    expect(comPlano.split('\n').slice(-3)).toEqual([
      '',
      'Plano terapêutico, metas em desenvolvimento:',
      '- Nomear cores fictícias',
    ]);
    expect(montarPedido('modelo-ficticio', PEDIDO)).toEqual({
      model: 'modelo-ficticio',
      messages: [
        { role: 'system', content: INSTRUCOES_DO_RASCUNHO },
        { role: 'user', content: conteudoDoPedido(PEDIDO) },
      ],
      response_format: FORMATO_DO_RASCUNHO,
    });
  });
});

describe('leitura do rascunho da IA', () => {
  it('apara os trechos e as metas, e corta no limite do banco', () => {
    const lido = lerRespostaDaIA(resposta(JSON.stringify(RASCUNHO)));
    expect(lido?.texto).toEqual({
      abertura: 'Abertura fictícia.',
      programas: 'Programas fictícios. Segunda frase.',
      comportamentos: '',
      recursos: '',
      fechamento: 'Fecho fictício.',
    });
    expect(lido?.metasAlcancadas).toEqual(['Meta alcançada']);
    expect(lido?.metasDoMes).toEqual([
      'Meta um',
      'Meta dois',
      'Meta três',
      'M'.repeat(MAXIMO_DA_META),
    ]);
    expect(lido?.frases.find((f) => f.campo === 'programas' && f.ordem === 1)).toEqual({
      campo: 'programas',
      ordem: 1,
      texto: 'Segunda frase.',
      sessoes: [2],
      documentos: [1],
    });
    expect(lido?.frases).toHaveLength(9);
  });

  it('recusa o que não segue o formato, em vez de gravar pela metade', () => {
    const vazio = { ...RASCUNHO, abertura: [], programas: [frase(' ')], fechamento: [] };
    for (const errado of [
      null,
      'texto solto',
      { ...RASCUNHO, metas_alcancadas: 'nenhuma' },
      { ...RASCUNHO, metas_do_mes: null },
      { ...RASCUNHO, recursos: 'texto solto' },
      vazio,
    ]) {
      expect(lerRascunho(errado)).toBeNull();
    }
    for (const semRascunho of [
      null,
      {},
      { choices: 'nada' },
      { choices: [] },
      { choices: [{}] },
      { choices: [{ message: 'oi' }] },
      resposta(null),
      resposta('{ isto não é JSON'),
    ]) {
      expect(lerRespostaDaIA(semRascunho)).toBeNull();
    }
  });
});

describe('orientações da IA (E22)', () => {
  it('sem orientação, as instruções são só as fixas', () => {
    expect(instrucoesDoRascunho([])).toBe(INSTRUCOES_DO_RASCUNHO);
  });

  it('as orientações ativas entram depois das instruções fixas, por campo, e prevalecem', () => {
    const instrucoes = instrucoesDoRascunho(ORIENTACOES);
    expect(instrucoes.startsWith(INSTRUCOES_DO_RASCUNHO)).toBe(true);
    expect(instrucoes).toContain('PREVALECEM sobre as regras acima e sobre os dados recebidos');
    expect(instrucoes).toContain('- programas:\n  - Cite o nível de ajuda de cada programa.');
    expect(instrucoes).toContain(
      '- metas_do_mes:\n  - Escreva cada meta com o verbo no infinitivo.',
    );
    expect(
      montarPedido('modelo-ficticio', { ...PEDIDO, orientacoes: ORIENTACOES }).messages[0],
    ).toEqual({ role: 'system', content: instrucoes });
  });

  it('lê as orientações do banco e deixa de fora a linha fora do formato', () => {
    expect(
      lerOrientacoes([
        { campo: 'programas', texto: '  Cite o nível de ajuda.  ' },
        { campo: 'campo_que_nao_existe', texto: 'Texto fictício.' },
        { campo: 'abertura', texto: '   ' },
        { campo: 'abertura', texto: 7 },
        'linha solta',
      ]),
    ).toEqual([{ campo: 'programas', texto: 'Cite o nível de ajuda.' }]);
    expect(lerOrientacoes(null)).toEqual([]);
  });
});
