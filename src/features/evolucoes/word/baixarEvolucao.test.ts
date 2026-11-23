import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { nomeDoWordDaEvolucao, wordDaEvolucao } from '@/features/evolucoes/word/baixarEvolucao';
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

describe('Evolução sozinha em Word (E14)', () => {
  it('sai com o aviso de conferência, o bloco do assistido e sem a assinatura', async () => {
    const arquivo = await wordDaEvolucao(EVOLUCAO);
    const pastas = unzipSync(new Uint8Array(await arquivo.arrayBuffer()));
    const documento = strFromU8(pastas['word/document.xml'] ?? new Uint8Array());

    expect(nomeDoWordDaEvolucao(EVOLUCAO)).toBe('Evolucao-UNA-2611-001-EV-conferencia.docx');
    expect(documento).toContain('Evolução de um assistido, só para conferência.');
    expect(documento).toContain('ALICE FICTÍCIA MOURA');
    expect(documento).toContain('Abertura fictícia.');
    expect(documento).not.toContain('______________________________');
  });
});
