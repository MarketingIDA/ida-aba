import { describe, expect, it } from 'vitest';

import {
  codigoDoRelatorio,
  gerarRelatorio,
  nomeDoRelatorio,
} from '@/features/progresso/pdf/gerarRelatorio';
import { textoDoPdf } from '@/features/progresso/pdf/texto';
import { medianaDaCarteira } from '@dominio/mediana.ts';
import { calcularProgresso, type MetaDoProgresso } from '@dominio/progresso.ts';

/** Lê de volta o texto de cada página, como faria quem seleciona o texto do PDF. */
async function textoDasPaginas(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const conteudo = await (await doc.getPage(i)).getTextContent();
    paginas.push(conteudo.items.map((t) => ('str' in t ? t.str : '')).join(' '));
  }
  return paginas;
}

const metas: MetaDoProgresso[] = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  programa: `Programa fictício ${String(i + 1)}`,
  texto: `Meta fictícia número ${String(i + 1)} com texto um pouco longo para quebrar a linha`,
  situacao: 'desenvolvimento',
}));
const pontos = metas.flatMap((m) =>
  ['2026-10-02', '2026-10-09', '2026-10-20'].map((data, j) => ({
    metaId: m.id,
    data,
    nivel: j + 3,
    trecho: `Trecho fictício ≥ 80% → com acerto 🙂 da meta ${String(m.id)} no dia ${data}.`,
  })),
);

describe('relatório de metas em PDF (E28)', () => {
  it('leva o nome, a comparação, o aviso de saúde e a página em todas as páginas, com texto seguro', async () => {
    const periodos = [
      {
        evolucaoId: 'e1',
        codigo: 'TST-2611-002-EV',
        mesRef: '2026-11-01',
        inicio: '2026-10-01',
        fim: '2026-10-31',
        lido: true,
      },
    ];
    const progresso = calcularProgresso(metas, pontos, periodos);
    if (progresso === null) throw new Error('sem progresso');
    const mediana = medianaDaCarteira(
      [
        { assistido: 1, independenteEm: '2026-10-20' },
        { assistido: 2, independenteEm: null },
      ],
      progresso.inicio,
      progresso.fim,
    );
    const dados = {
      nome: 'Ana Fictícia Souza',
      codigo: codigoDoRelatorio('TST-2611-002-EV'),
      emitidoPor: 'Coordenadora Fictícia',
      emitidoEm: new Date('2026-11-19T15:30:00Z'),
      progresso,
      mediana,
      periodos,
    };
    const paginas = await textoDasPaginas(await gerarRelatorio(dados, null));

    expect(nomeDoRelatorio(dados)).toBe('TST-2611-002-METAS.pdf');
    expect(paginas.length).toBeGreaterThan(2);
    expect(paginas[0]).toContain('Ana Fictícia Souza');
    expect(paginas[0]).toContain('Acima da mediana da carteira, que é de 0,5 metas');
    paginas.forEach((p, i) => {
      expect(p).toContain('Dados de saúde de uma criança');
      expect(p).toContain(`Página ${String(i + 1)} de ${String(paginas.length)}`);
      expect(p).toContain('Emitido em 19/11/2026 às 12:30 por Coordenadora Fictícia');
    });
    expect(paginas.join(' ')).toContain('>= 80% -> com acerto');
    expect(textoDoPdf('a b ≥ c 🙂')).toBe('a b >= c ');
  });
});
