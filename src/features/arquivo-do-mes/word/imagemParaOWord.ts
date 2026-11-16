/** A imagem como o Word aceita: PNG ou JPEG (ele não lê WebP), com o tamanho em pixels na folha. */
export interface ImagemDoWord {
  dados: Uint8Array;
  tipo: 'png' | 'jpg';
  largura: number;
  altura: number;
}

/** A caixa da assinatura no fim do arquivo, em pixels do Word (96 por polegada). */
const CAIXA = { largura: 220, altura: 60 };

/** O quadro em que a imagem é redesenhada: o dobro da caixa e um pouco mais, para sair nítida. */
const QUADRO = { largura: 520, altura: 142 };

const TIPO_DO_WORD: Record<string, ImagemDoWord['tipo'] | undefined> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** Onde o navegador não redesenha, o PNG e o JPEG vão como vieram; o WebP fica de fora. */
async function comoVeio(imagem: Blob): Promise<ImagemDoWord | null> {
  const tipo = TIPO_DO_WORD[imagem.type];
  if (tipo === undefined) return null;
  return { dados: new Uint8Array(await imagem.arrayBuffer()), tipo, ...CAIXA };
}

/**
 * A assinatura pronta para o Word: redesenhada num PNG de fundo branco, inteira e centralizada,
 * sem distorcer. Serve para qualquer formato gravado (PNG com transparência, JPEG ou WebP).
 */
export async function imagemParaOWord(imagem: Blob): Promise<ImagemDoWord | null> {
  if (typeof createImageBitmap !== 'function') return comoVeio(imagem);

  const bitmap = await createImageBitmap(imagem);
  const quadro = document.createElement('canvas');
  quadro.width = QUADRO.largura;
  quadro.height = QUADRO.altura;
  const pincel = quadro.getContext('2d');
  if (pincel === null) {
    bitmap.close();
    return comoVeio(imagem);
  }
  const escala = Math.min(QUADRO.largura / bitmap.width, QUADRO.altura / bitmap.height);
  const largura = bitmap.width * escala;
  const altura = bitmap.height * escala;
  pincel.fillStyle = '#ffffff';
  pincel.fillRect(0, 0, QUADRO.largura, QUADRO.altura);
  pincel.drawImage(
    bitmap,
    (QUADRO.largura - largura) / 2,
    (QUADRO.altura - altura) / 2,
    largura,
    altura,
  );
  bitmap.close();

  const png = await new Promise<Blob | null>((resolver) => {
    quadro.toBlob(resolver, 'image/png');
  });
  if (png === null) return comoVeio(imagem);
  return { dados: new Uint8Array(await png.arrayBuffer()), tipo: 'png', ...CAIXA };
}
