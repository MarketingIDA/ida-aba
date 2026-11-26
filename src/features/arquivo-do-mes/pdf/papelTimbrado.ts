import imagem from '@/assets/marca/papel-timbrado.png?inline';

/**
 * O papel timbrado do Instituto: a folha A4 inteira, com a arte do topo e do rodapé, que vai atrás
 * do texto em todas as páginas do PDF. Este módulo só é carregado na hora de gerar o arquivo.
 */
export function papelTimbrado(): Uint8Array {
  const base64 = imagem.slice(imagem.indexOf(',') + 1);
  return Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0));
}
