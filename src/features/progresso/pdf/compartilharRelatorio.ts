import { registrarRelatorio } from '@/features/progresso/api/relatorio.api';
import { ErroApp } from '@/lib/erroApp';
import { salvarArquivo } from '@/utils/salvarArquivo';

/**
 * Enviar e copiar o link do relatório de metas (E28). O navegador só deixa enviar ou copiar no
 * mesmo toque do botão: nada é esperado antes de `navigator.share` e `clipboard.writeText`. Por
 * isso o PDF já vem pronto da janela, e o registro do envio e do link vem depois (um envio
 * cancelado não fica registrado). O download para anexar continua registrado antes de sair.
 */

export type ResultadoDoEnvio = 'enviou' | 'baixou_para_enviar' | 'cancelou';

const SEM_REGISTRO = (o_que: string) =>
  new ErroApp(
    'indisponivel',
    `${o_que}, mas o registro não foi gravado. Avise a coordenação geral de quando e para quem foi.`,
  );

async function registrarDepois(assistidoId: number, acao: 'enviou' | 'copiou_link') {
  try {
    await registrarRelatorio(assistidoId, acao);
  } catch {
    throw SEM_REGISTRO(acao === 'enviou' ? 'O PDF foi enviado' : 'O link foi copiado');
  }
}

/** Envia o PDF pelo aparelho; onde o navegador não envia arquivo, baixa para anexar. */
export async function enviarRelatorio(
  assistidoId: number,
  arquivo: File,
  codigo: string,
): Promise<ResultadoDoEnvio> {
  const dados = {
    files: [arquivo],
    title: 'Evolução das metas',
    text: `Evolução das metas ${codigo}`,
  };
  if (typeof navigator.canShare === 'function' && navigator.canShare(dados)) {
    try {
      await navigator.share(dados);
      await registrarDepois(assistidoId, 'enviou');
      return 'enviou';
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === 'AbortError') return 'cancelou';
      if (erro instanceof ErroApp) throw erro;
    }
  }
  await registrarRelatorio(assistidoId, 'baixou_para_enviar');
  salvarArquivo(arquivo, arquivo.name);
  return 'baixou_para_enviar';
}

/** O endereço desta tela: abre só para quem já tem acesso ao assistido. */
export const linkDoProgresso = (assistidoId: number): string =>
  new URL(`/progresso/${String(assistidoId)}`, window.location.origin).href;

/** Copia o link da tela e registra. */
export async function copiarLink(assistidoId: number): Promise<string> {
  const link = linkDoProgresso(assistidoId);
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    throw new ErroApp('indisponivel', `Não deu para copiar. O link é ${link}`);
  }
  await registrarDepois(assistidoId, 'copiou_link');
  return link;
}
