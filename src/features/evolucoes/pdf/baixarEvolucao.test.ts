import { describe, expect, it } from 'vitest';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { nomeDoPdfDaEvolucao, pdfDaEvolucao } from '@/features/evolucoes/pdf/baixarEvolucao';
import { TRECHOS_VAZIOS } from '@dominio/evolucao.ts';

/** Evolução fictícia; nenhum nome aqui é de pessoa real. */
const EVOLUCAO = {
  codigo: 'UNA-2611-001-EV',
  mesRef: '2026-11-01',
  assistido: 'Alice Fictícia Moura',
  plano: 'Plano Fictício',
  unidade: 'Unidade Fictícia',
  turno: 'manha',
  coordenador: 'Carla Fictícia Coordenadora',
  texto: {
    conteudo: { ...TRECHOS_VAZIOS, abertura: 'Abertura fictícia.' },
    autor: 'coordenador',
    criadoEm: '2026-11-05T15:00:00Z',
    criadoPor: null,
  },
  metasAlcancadas: null,
  metasDoMes: null,
} as unknown as Evolucao;

describe('Evolução sozinha em PDF (E14)', () => {
  it('sai com o aviso de conferência, o bloco do assistido e sem a assinatura', async () => {
    const arquivo = await pdfDaEvolucao(EVOLUCAO);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const dados = new Uint8Array(await arquivo.arrayBuffer());
    const doc = await pdfjs.getDocument({ data: dados }).promise;
    const conteudo = await (await doc.getPage(1)).getTextContent();
    const documento = conteudo.items.map((t) => ('str' in t ? t.str : '')).join(' ');

    expect(nomeDoPdfDaEvolucao(EVOLUCAO)).toBe('Evolucao-UNA-2611-001-EV-conferencia.pdf');
    expect(doc.numPages).toBe(1);
    expect(documento).toContain('só para conferência.');
    expect(documento).toContain('ALICE FICTÍCIA MOURA');
    expect(documento).toContain('Abertura fictícia.');
    expect(documento).not.toContain('CRP');
  });
});
