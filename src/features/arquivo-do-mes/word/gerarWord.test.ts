import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import type { ConteudoDoArquivo } from '@/features/arquivo-do-mes/api/conteudo.api';
import { gerarWord, nomeDoWord } from '@/features/arquivo-do-mes/word/gerarWord';
import { TRECHOS_VAZIOS } from '@dominio/evolucao.ts';

/** Um PNG de 1 × 1 pixel: basta para o Word aceitar a imagem. */
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (letra) => letra.charCodeAt(0),
);

/** Arquivo fictício de uma carteira, já enviado. Nenhum nome aqui é de pessoa real. */
const CONTEUDO: ConteudoDoArquivo = {
  unidade: 'Unidade Fictícia',
  unidadeSigla: 'UNA',
  turno: 'manha',
  mesRef: '2026-11-01',
  enviadoEm: '2026-11-04T15:00:00Z',
  coordenador: 'Carla Fictícia Coordenadora',
  crp: '02/00001',
  assinatura: '2/00000000-0000-4000-8000-00000000000a.png',
  evolucoes: [
    {
      codigo: 'UNA-2611-004-EV',
      assistido: 'Davi Fictício Nunes',
      plano: 'Plano Fictício',
      texto: { ...TRECHOS_VAZIOS, abertura: 'Abertura fictícia.', fechamento: 'Fecho fictício.' },
      metasAlcancadas: ['Meta alcançada fictícia'],
      metasDoMes: ['Meta um', 'Meta dois', 'Meta três', 'Meta quatro'],
    },
    {
      codigo: 'UNA-2611-005-EV',
      assistido: 'Elisa Fictícia Torres',
      plano: null,
      texto: { ...TRECHOS_VAZIOS, programas: 'Programas fictícios.' },
      metasAlcancadas: [],
      metasDoMes: ['Meta cinco', 'Meta seis', 'Meta sete', 'Meta oito'],
    },
  ],
};

async function abrir(arquivo: Blob) {
  const pastas = unzipSync(new Uint8Array(await arquivo.arrayBuffer()));
  const xml = (caminho: string) => strFromU8(pastas[caminho] ?? new Uint8Array());
  return { pastas, documento: xml('word/document.xml'), estilos: xml('word/styles.xml') };
}

/** O texto do documento, parágrafo a parágrafo, sem as marcas do Word. */
const paragrafos = (documento: string) =>
  [...documento.matchAll(/<w:p[ >].*?<\/w:p>/gs)].map(([p]) =>
    [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(([, texto]) => texto).join(''),
  );

describe('Word do arquivo do mês', () => {
  it('sai no formato do modelo: cabeçalho, um bloco por assistido e a assinatura no fim', async () => {
    const { pastas, documento, estilos } = await abrir(
      await gerarWord(CONTEUDO, { dados: PNG, tipo: 'png', largura: 220, altura: 60 }),
    );
    const texto = paragrafos(documento).filter((p) => p !== '');

    expect(texto.slice(0, 8)).toEqual([
      'Nome do profissional: Carla Fictícia Coordenadora',
      'Unidade: Unidade Fictícia',
      'Turno: Manhã',
      'Especialidade: ABA',
      'Mês/ano: Novembro, 2026',
      'Nome do assistido: DAVI FICTÍCIO NUNES',
      'Plano de saúde: Plano Fictício',
      'Especialidade: ABA',
    ]);
    expect(texto).toContain('Abertura fictícia. Fecho fictício.');
    expect(texto.filter((p) => p.startsWith('Para o mês atual, a terapia focará'))).toHaveLength(2);
    expect(texto.indexOf('Nome do assistido: ELISA FICTÍCIA TORRES')).toBeGreaterThan(
      texto.indexOf('Meta quatro'),
    );
    expect(texto.slice(-3)).toEqual([
      '______________________________',
      'Carla Fictícia Coordenadora',
      'CRP 02/00001',
    ]);
    expect(texto.join(' ')).not.toContain('Prévia');

    // Cambria 12 com espaçamento 1,5, e a imagem da assinatura dentro do arquivo.
    expect(estilos).toContain('w:ascii="Cambria"');
    expect(estilos).toContain('w:sz w:val="24"');
    expect(estilos).toContain('w:line="360"');
    expect(Object.keys(pastas).some((caminho) => caminho.startsWith('word/media/'))).toBe(true);
    expect(nomeDoWord(CONTEUDO)).toBe('Evolucao-mensal-UNA-manha-2611.docx');
  });

  it('a prévia avisa no topo e no nome que o arquivo ainda não foi enviado', async () => {
    const previa = { ...CONTEUDO, enviadoEm: null, assinatura: null, crp: null };
    const { pastas, documento } = await abrir(await gerarWord(previa, null));
    const texto = paragrafos(documento).filter((p) => p !== '');

    expect(texto[0]).toBe(
      'Prévia para conferência. O arquivo ainda não foi enviado a contas médicas pelo sistema.',
    );
    expect(texto.at(-1)).toBe('Carla Fictícia Coordenadora');
    expect(Object.keys(pastas).some((caminho) => caminho.startsWith('word/media/'))).toBe(false);
    expect(nomeDoWord(previa)).toBe('Evolucao-mensal-UNA-manha-2611-previa.docx');
  });
});
