import { linhasDoPdf } from '@/features/evolucoes/tita/lerPdf';
import { textoDaImagem } from '@/features/evolucoes/documentos/lerImagem';
import { ErroApp, ehErroApp } from '@/lib/erroApp';

/**
 * Tira o texto de um dos outros documentos (E25), no navegador: o arquivo não é enviado a servidor
 * nenhum e não é guardado. PDF e Word (.docx) pelo texto do arquivo; foto e imagem por OCR.
 * As bibliotecas (`pdfjs-dist`, `mammoth` e `tesseract.js`) só são carregadas aqui, na hora de ler.
 */
const LIMITE = 20 * 1024 * 1024;

const IMAGENS = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export const ACEITOS = `application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,${IMAGENS}`;

/** O que o botão "Tirar foto" aceita: a câmera do celular entrega JPG. */
export const ACEITOS_DA_FOTO = IMAGENS;

type Formato = 'pdf' | 'docx' | 'doc' | 'imagem' | 'heic' | 'outro';

function formatoDe(arquivo: File): Formato {
  const nome = arquivo.name.toLowerCase();
  if (arquivo.type === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  if (nome.endsWith('.docx')) return 'docx';
  if (nome.endsWith('.doc')) return 'doc';
  if (HEIC.test(nome) || HEIC.test(arquivo.type)) return 'heic';
  if (arquivo.type.startsWith('image/')) return 'imagem';
  return 'outro';
}

const RECUSAS: Record<'doc' | 'heic' | 'outro', string> = {
  doc: 'Arquivo .doc antigo não é lido. Abra no Word e salve como .docx.',
  heic: 'Foto em HEIC não é lida. Tire a foto pelo botão "Tirar foto" ou salve em JPG.',
  outro: 'Junte o documento em PDF, Word (.docx) ou foto (JPG ou PNG).',
};

const HEIC = /\.hei[cf]$|image\/hei[cf]/;

async function lerPorFormato(
  arquivo: File,
  formato: 'pdf' | 'docx' | 'imagem',
): Promise<{ paginas: number | null; texto: string }> {
  if (formato === 'pdf') {
    const { linhas, paginas } = await linhasDoPdf(arquivo, false);
    return { paginas, texto: linhas.join('\n') };
  }
  if (formato === 'docx') return { paginas: null, texto: await textoDoWord(arquivo) };
  return { paginas: null, texto: await textoDaImagem(arquivo) };
}

async function textoDoWord(arquivo: File): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await arquivo.arrayBuffer() });
  return value;
}

/**
 * O texto do documento e o número de páginas (o Word e a foto não dizem). `imagem` marca o texto
 * lido por OCR: ele sempre passa pela conferência do coordenador.
 */
export async function lerDocumento(
  arquivo: File,
): Promise<{ arquivo: string; paginas: number | null; texto: string; imagem: boolean }> {
  const formato = formatoDe(arquivo);
  if (formato === 'doc' || formato === 'heic' || formato === 'outro') {
    throw new ErroApp('regra_violada', `${arquivo.name}: ${RECUSAS[formato]}`);
  }
  if (arquivo.size > LIMITE) {
    throw new ErroApp('regra_violada', `${arquivo.name}: o arquivo passa de 20 MB.`);
  }
  let lido: { paginas: number | null; texto: string };
  try {
    lido = await lerPorFormato(arquivo, formato);
  } catch (causa) {
    if (ehErroApp(causa)) throw causa;
    throw new ErroApp('regra_violada', `${arquivo.name}: não foi possível ler o arquivo.`, causa);
  }
  if (lido.texto.trim() === '') {
    throw new ErroApp(
      'regra_violada',
      `${arquivo.name}: não há texto para ler. Se é um documento digitalizado, tire uma foto de cada página.`,
    );
  }
  return { arquivo: arquivo.name, ...lido, imagem: formato === 'imagem' };
}
