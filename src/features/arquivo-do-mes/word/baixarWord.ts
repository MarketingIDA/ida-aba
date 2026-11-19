import {
  baixarAssinatura,
  buscarConteudoDoArquivo,
} from '@/features/arquivo-do-mes/api/conteudo.api';
import { gerarWord, nomeDoWord } from '@/features/arquivo-do-mes/word/gerarWord';
import { imagemParaOWord } from '@/features/arquivo-do-mes/word/imagemParaOWord';
import { ErroApp } from '@/lib/erroApp';
import { salvarArquivo } from '@/utils/salvarArquivo';

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
  salvarArquivo(await gerarWord(conteudo, assinatura), nome);
  return nome;
}
