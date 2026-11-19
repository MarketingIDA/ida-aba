/** Entrega o arquivo ao navegador, que o salva com o nome dado. */
export function salvarArquivo(arquivo: Blob, nome: string): void {
  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = endereco;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador já começou a baixar; o endereço temporário pode ser liberado logo depois.
  setTimeout(() => {
    URL.revokeObjectURL(endereco);
  }, 3000);
}
