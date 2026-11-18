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

const RASCUNHO = {
  abertura: ' Abertura fictícia. ',
  programas: 'Programas fictícios.',
  comportamentos: '',
  recursos: '',
  fechamento: 'Fecho fictício.',
  metas_alcancadas: [' Meta alcançada ', '', 7],
  metas_do_mes: ['Meta um', 'Meta dois', 'Meta três', 'M'.repeat(MAXIMO_DA_META + 10)],
};

const resposta = (content: unknown) => ({ choices: [{ message: { content } }] });

describe('pedido do rascunho à IA', () => {
  it('leva o mês, o tratamento, a frequência e as análises, com a falta marcada', () => {
    expect(conteudoDoPedido(PEDIDO)).toBe(
      [
        'Evolução de novembro de 2026. Período analisado: 01/10/2026 a 31/10/2026.',
        'Tratamento: a assistida.',
        'Frequência: 1 sessões realizadas em 2 evoluções diárias (50%).',
        '',
        'Análises do atendimento:',
        '[05/10] A assistida seguiu a rotina com dica verbal.',
        '[07/10, falta] A assistida não compareceu.',
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
      '[Relatório escolar, 20/10/2026] A assistida participa da roda.',
      '[Avaliação, 02/03/2026, contexto] Avaliação fictícia.',
      '[Outro, sem data, contexto] Bilhete fictício.',
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
    expect(lerRespostaDaIA(resposta(JSON.stringify(RASCUNHO)))).toEqual({
      texto: {
        abertura: 'Abertura fictícia.',
        programas: 'Programas fictícios.',
        comportamentos: '',
        recursos: '',
        fechamento: 'Fecho fictício.',
      },
      metasAlcancadas: ['Meta alcançada'],
      metasDoMes: ['Meta um', 'Meta dois', 'Meta três', 'M'.repeat(MAXIMO_DA_META)],
    });
  });

  it('recusa o que não segue o formato, em vez de gravar pela metade', () => {
    const vazio = { ...RASCUNHO, abertura: '', programas: ' ', fechamento: '' };
    for (const errado of [
      null,
      'texto solto',
      { ...RASCUNHO, metas_alcancadas: 'nenhuma' },
      { ...RASCUNHO, metas_do_mes: null },
      { ...RASCUNHO, recursos: 3 },
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

  it('as orientações ativas entram depois das instruções fixas, cada uma com o campo', () => {
    const instrucoes = instrucoesDoRascunho(ORIENTACOES);
    expect(instrucoes.startsWith(INSTRUCOES_DO_RASCUNHO)).toBe(true);
    expect(instrucoes).toContain('- programas: Cite o nível de ajuda de cada programa.');
    expect(instrucoes).toContain('- metas_do_mes: Escreva cada meta com o verbo no infinitivo.');
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
