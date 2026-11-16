import { ErroApp } from '@/lib/erroApp';

/**
 * Tira o texto do PDF do Tita, no navegador: o arquivo não é enviado a servidor nenhum. Devolve as
 * linhas de cada página, de cima para baixo, sem o cabeçalho e o rodapé (E02). A biblioteca
 * `pdfjs-dist` só é carregada aqui, na hora de ler.
 */
const LIMITE_DO_PDF = 20 * 1024 * 1024;

/** Faixas da página (em pontos) onde ficam o cabeçalho e o rodapé do relatório. */
const CABECALHO = 82;
const RODAPE = 45;

interface Trecho {
  str: string;
  transform: number[];
}

/** Junta os trechos de texto da página em linhas, pela altura, e descarta as faixas das bordas. */
export function linhasDaPagina(trechos: readonly Trecho[], altura: number): string[] {
  const porAltura = new Map<number, { x: number; texto: string }[]>();
  for (const { str, transform } of trechos) {
    const [, , , , x = 0, y = 0] = transform;
    if (str.trim() === '' || y > altura - CABECALHO || y < RODAPE) continue;
    // Trechos da mesma linha podem diferir em 1 ou 2 pontos na altura.
    const linha = [...porAltura.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
    porAltura.set(linha, [...(porAltura.get(linha) ?? []), { x, texto: str }]);
  }
  return [...porAltura]
    .toSorted(([a], [b]) => b - a)
    .map(([, itens]) =>
      itens
        .toSorted((a, b) => a.x - b.x)
        .map((item) => item.texto)
        .join(' '),
    );
}

/** As linhas de texto do PDF escolhido. */
export async function lerPdf(arquivo: File): Promise<string[]> {
  if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
    throw new ErroApp('regra_violada', 'Escolha o PDF exportado do Tita.');
  }
  if (arquivo.size > LIMITE_DO_PDF) {
    throw new ErroApp('regra_violada', 'O PDF passa de 20 MB. Exporte um mês por vez no Tita.');
  }
  try {
    const [pdfjs, motor] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = motor.default;
    const tarefa = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) });
    const documento = await tarefa.promise;
    const linhas: string[] = [];
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero);
      const { items } = await pagina.getTextContent();
      const trechos = items.filter((item): item is typeof item & Trecho => 'str' in item);
      linhas.push(...linhasDaPagina(trechos, pagina.getViewport({ scale: 1 }).height));
    }
    await tarefa.destroy();
    return linhas;
  } catch (causa) {
    throw new ErroApp(
      'regra_violada',
      'Não foi possível ler este PDF. Exporte de novo no Tita.',
      causa,
    );
  }
}
