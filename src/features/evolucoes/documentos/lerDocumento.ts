import { linhasDoPdf } from '@/features/evolucoes/tita/lerPdf';
import { ErroApp } from '@/lib/erroApp';

/**
 * Tira o texto de um dos outros documentos (E25), no navegador: o arquivo não é enviado a servidor
 * nenhum e não é guardado. Nesta etapa, PDF e Word (.docx); foto e imagem vêm na próxima. As
 * bibliotecas (`pdfjs-dist` e `mammoth`) só são carregadas aqui, na hora de ler.
 */
const LIMITE = 20 * 1024 * 1024;

export const ACEITOS =
  'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx';

type Formato = 'pdf' | 'docx' | 'doc' | 'imagem' | 'outro';

function formatoDe(arquivo: File): Formato {
  const nome = arquivo.name.toLowerCase();
  if (arquivo.type === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  if (nome.endsWith('.docx')) return 'docx';
  if (nome.endsWith('.doc')) return 'doc';
  if (arquivo.type.startsWith('image/')) return 'imagem';
  return 'outro';
}

const RECUSAS: Record<'doc' | 'imagem' | 'outro', string> = {
  doc: 'Arquivo .doc antigo não é lido. Abra no Word e salve como .docx.',
  imagem: 'Foto e imagem ainda não são lidas. Por enquanto, junte o documento em PDF ou Word.',
  outro: 'Junte o documento em PDF ou Word (.docx).',
};

async function textoDoWord(arquivo: File): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await arquivo.arrayBuffer() });
  return value;
}

/** O texto do documento e o número de páginas (o Word não diz). */
export async function lerDocumento(
  arquivo: File,
): Promise<{ arquivo: string; paginas: number | null; texto: string }> {
  const formato = formatoDe(arquivo);
  if (formato !== 'pdf' && formato !== 'docx') {
    throw new ErroApp('regra_violada', `${arquivo.name}: ${RECUSAS[formato]}`);
  }
  if (arquivo.size > LIMITE) {
    throw new ErroApp('regra_violada', `${arquivo.name}: o arquivo passa de 20 MB.`);
  }
  let lido: { paginas: number | null; texto: string };
  try {
    if (formato === 'pdf') {
      const { linhas, paginas } = await linhasDoPdf(arquivo, false);
      lido = { paginas, texto: linhas.join('\n') };
    } else {
      lido = { paginas: null, texto: await textoDoWord(arquivo) };
    }
  } catch (causa) {
    throw new ErroApp('regra_violada', `${arquivo.name}: não foi possível ler o arquivo.`, causa);
  }
  if (lido.texto.trim() === '') {
    throw new ErroApp(
      'regra_violada',
      `${arquivo.name}: não há texto para ler. Se é um documento digitalizado, ele vira foto na próxima etapa.`,
    );
  }
  return { arquivo: arquivo.name, ...lido };
}
