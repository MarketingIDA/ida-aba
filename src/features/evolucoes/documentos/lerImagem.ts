import { ErroApp } from '@/lib/erroApp';

/**
 * O texto de uma foto ou imagem de documento (E25), por OCR no navegador: a imagem não sai do
 * computador. O tesseract.js, o núcleo em WebAssembly e o modelo do português vêm do próprio site
 * (o modelo é servido em `/ocr`, ver `vite.config.ts`), e só são carregados na hora de ler.
 */

/** O lado maior da imagem antes do OCR: foto de celular inteira é lenta e não lê melhor. */
const LADO_MAXIMO = 2400;

/** Abaixo disso (0 a 100), o tesseract quase sempre leu borrão, sombra ou letra de mão. */
const CONFIANCA_MINIMA = 45;

/** A imagem reduzida num canvas; a foto em HEIC do iPhone não abre no Chrome. */
async function imagemReduzida(arquivo: File): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch (causa) {
    throw new ErroApp(
      'regra_violada',
      `${arquivo.name}: a imagem não abre neste navegador. Tire a foto de novo pelo botão "Tirar foto" ou salve em JPG ou PNG.`,
      causa,
    );
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Lê o texto da imagem em português; o worker do OCR é encerrado a cada leitura. */
export async function textoDaImagem(arquivo: File): Promise<string> {
  const canvas = await imagemReduzida(arquivo);
  const [tesseract, worker, nucleo] = await Promise.all([
    import('tesseract.js'),
    import('tesseract.js/dist/worker.min.js?url'),
    import('tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'),
  ]);
  let leitor: Awaited<ReturnType<typeof tesseract.createWorker>> | undefined;
  try {
    leitor = await tesseract.createWorker('por', tesseract.OEM.LSTM_ONLY, {
      workerPath: worker.default,
      corePath: nucleo.default,
      langPath: `${window.location.origin}/ocr`,
      workerBlobURL: false,
    });
    const { data } = await leitor.recognize(canvas);
    if (data.confidence < CONFIANCA_MINIMA) {
      throw new ErroApp(
        'regra_violada',
        `${arquivo.name}: a foto não ficou legível. Tire de novo, com o papel reto, sem sombra e com boa luz.`,
      );
    }
    return data.text;
  } finally {
    await leitor?.terminate();
  }
}
