import {
  baixarAssinatura,
  buscarConteudoDoArquivo,
} from '@/features/arquivo-do-mes/api/conteudo.api';
import { gerarWord, nomeDoWord } from '@/features/arquivo-do-mes/word/gerarWord';
import { imagemParaOWord } from '@/features/arquivo-do-mes/word/imagemParaOWord';
import { ErroApp } from '@/lib/erroApp';

/** Entrega o arquivo ao navegador, que o salva com o nome dado. */
function salvar(arquivo: Blob, nome: string): void {
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

/**
 * Baixa o Word do arquivo do mês de uma carteira: lê o conteúdo que o banco deixa, busca a
 * assinatura, monta o documento no navegador e o salva. Antes do envio, sai a prévia.
 */
export async function baixarWord(carteiraId: number, mesRef: string): Promise<string> {
  const conteudo = await buscarConteudoDoArquivo(carteiraId, mesRef);
  if (conteudo.evolucoes.length === 0) {
    throw new ErroApp('regra_violada', 'Ainda não há evolução concluída para pôr no Word.');
  }
  const assinatura =
    conteudo.assinatura === null
      ? null
      : await imagemParaOWord(await baixarAssinatura(conteudo.assinatura));
  const nome = nomeDoWord(conteudo);
  salvar(await gerarWord(conteudo, assinatura), nome);
  return nome;
}
