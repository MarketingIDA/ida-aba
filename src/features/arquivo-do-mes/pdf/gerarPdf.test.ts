import { describe, expect, it } from 'vitest';

import type { ConteudoDoArquivo } from '@/features/arquivo-do-mes/api/conteudo.api';
import { gerarPdf, nomeDoPdf } from '@/features/arquivo-do-mes/pdf/gerarPdf';
import { TRECHOS_VAZIOS } from '@dominio/evolucao.ts';

/** Um PNG de 1 × 1 pixel: basta para o PDF aceitar a imagem. */
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (letra) => letra.charCodeAt(0),
);

/** Muitas metas, para o arquivo passar de uma página. */
const METAS = Array.from({ length: 30 }, (_, i) => `Meta fictícia número ${String(i + 1)}`);

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
      metasDoMes: METAS,
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

/** Lê de volta o texto de cada página, como faria quem seleciona o texto do PDF. */
async function textoDasPaginas(arquivo: Blob): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: dados }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const conteudo = await (await doc.getPage(i)).getTextContent();
    paginas.push(conteudo.items.map((t) => ('str' in t ? t.str : '')).join(' '));
  }
  return paginas;
}

describe('PDF do arquivo do mês', () => {
  it('leva o cabeçalho uma vez, um bloco por assistido, a assinatura no fim e a página em todas', async () => {
    const assinatura = { dados: PNG, tipo: 'png', largura: 220, altura: 60 } as const;
    const paginas = await textoDasPaginas(await gerarPdf(CONTEUDO, assinatura));
    const tudo = paginas.join(' ');

    expect(paginas.length).toBeGreaterThan(1);
    expect(paginas[0]).toContain('Evolução mensal');
    expect(paginas[0]).toContain('Carla Fictícia Coordenadora');
    expect(paginas[0]).toContain('Unidade Fictícia');
    expect(paginas[0]).toContain('Manhã');
    expect(paginas[0]).toContain('Novembro, 2026');
    expect(paginas[0]).toContain('DAVI FICTÍCIO NUNES');
    expect(paginas[0]).toContain('Plano Fictício');
    expect(tudo).toContain('Meta alcançada fictícia');
    expect(tudo.split('ELISA FICTÍCIA TORRES')).toHaveLength(2);
    expect(tudo.indexOf('ELISA FICTÍCIA TORRES')).toBeGreaterThan(tudo.indexOf('número 30'));
    expect(paginas.at(-1)).toContain('CRP 02/00001');
    expect(tudo).not.toContain('Prévia');
    paginas.forEach((p, i) => {
      expect(p).toContain(`Página ${String(i + 1)} de ${String(paginas.length)}`);
    });
    expect(nomeDoPdf(CONTEUDO)).toBe('Evolucao-mensal-UNA-manha-2611.pdf');
  });

  it('a prévia avisa no topo e no nome que o arquivo ainda não foi enviado', async () => {
    const previa = { ...CONTEUDO, enviadoEm: null, assinatura: null, crp: null };
    const paginas = await textoDasPaginas(await gerarPdf(previa, null));

    expect(paginas[0]).toContain('Prévia para conferência.');
    expect(paginas.join(' ')).not.toContain('CRP');
    expect(nomeDoPdf(previa)).toBe('Evolucao-mensal-UNA-manha-2611-previa.pdf');
  });
});
