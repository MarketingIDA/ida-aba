import {
  baixarAssinatura,
  buscarConteudoDoArquivo,
} from '@/features/arquivo-do-mes/api/conteudo.api';
import { gerarPdf, nomeDoPdf } from '@/features/arquivo-do-mes/pdf/gerarPdf';
import { imagemDaAssinatura } from '@/features/arquivo-do-mes/pdf/imagemDaAssinatura';
import { ErroApp } from '@/lib/erroApp';
import { salvarArquivo } from '@/utils/salvarArquivo';

/**
 * Baixa o PDF do arquivo do mês de uma carteira: lê o conteúdo que o banco deixa, busca a
 * assinatura, monta o documento no navegador e o salva. Antes do envio, sai a prévia.
 */
export async function baixarPdf(carteiraId: number, mesRef: string): Promise<string> {
  const conteudo = await buscarConteudoDoArquivo(carteiraId, mesRef);
  if (conteudo.evolucoes.length === 0) {
    throw new ErroApp('regra_violada', 'Ainda não há evolução concluída para pôr no PDF.');
  }
  const assinatura =
    conteudo.assinatura === null
      ? null
      : await imagemDaAssinatura(await baixarAssinatura(conteudo.assinatura));
  const nome = nomeDoPdf(conteudo);
  salvarArquivo(await gerarPdf(conteudo, assinatura), nome);
  return nome;
}
