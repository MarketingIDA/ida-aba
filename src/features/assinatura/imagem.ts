import {
  enderecoDaImagem,
  LIMITE_DA_IMAGEM,
  TIPOS_DE_IMAGEM,
  type TipoDeImagem,
} from '@/features/assinatura/api/assinatura.api';
import { ErroApp } from '@/lib/erroApp';

/** Lado maior da imagem gravada: sobra para a assinatura no Word e corta a foto do celular. */
const LADO_MAIOR = 1200;

export interface ImagemPronta {
  imagem: Blob;
  tipo: TipoDeImagem;
  /** Para a prévia na tela. */
  endereco: string;
}

function ehTipoAceito(tipo: string): tipo is TipoDeImagem {
  return (TIPOS_DE_IMAGEM as readonly string[]).includes(tipo);
}

async function dentroDoLimite(imagem: Blob, tipo: TipoDeImagem): Promise<ImagemPronta> {
  if (imagem.size > LIMITE_DA_IMAGEM) {
    throw new ErroApp('regra_violada', 'A imagem passa de 2 MB. Use uma imagem menor.');
  }
  return { imagem, tipo, endereco: await enderecoDaImagem(imagem) };
}

/**
 * Deixa a imagem escolhida pronta para enviar: só PNG, JPEG ou WebP, com o lado maior em até
 * 1200 px. A foto da câmera vira JPEG; o PNG continua PNG, para não perder o fundo transparente.
 * Onde o navegador não redimensiona, a imagem vai como veio, se couber nos 2 MB.
 */
export async function prepararImagem(arquivo: File): Promise<ImagemPronta> {
  if (!ehTipoAceito(arquivo.type)) {
    throw new ErroApp('regra_violada', 'Use uma imagem PNG, JPEG ou WebP.');
  }
  if (typeof createImageBitmap !== 'function') {
    return dentroDoLimite(arquivo, arquivo.type);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch (causa) {
    throw new ErroApp('regra_violada', 'Não foi possível ler esta imagem. Tente outra.', causa);
  }
  const escala = Math.min(1, LADO_MAIOR / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const tipo: TipoDeImagem = arquivo.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const imagem = await new Promise<Blob | null>((resolver) => {
    canvas.toBlob(resolver, tipo, 0.9);
  });
  if (imagem === null) {
    throw new ErroApp('regra_violada', 'Não foi possível ler esta imagem. Tente outra.');
  }
  return dentroDoLimite(imagem, tipo);
}
