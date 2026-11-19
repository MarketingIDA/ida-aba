import logo from '@/assets/marca/logo-instituto-autismo.png';
import { registrarRelatorio } from '@/features/progresso/api/relatorio.api';
import { gerarRelatorio, nomeDoRelatorio } from '@/features/progresso/pdf/gerarRelatorio';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import { salvarArquivo } from '@/utils/salvarArquivo';

/** O PNG da marca; se não vier, o relatório sai com o nome do instituto no lugar. */
async function lerLogo(): Promise<Uint8Array | null> {
  try {
    const resposta = await fetch(logo);
    return resposta.ok ? new Uint8Array(await resposta.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Monta o PDF no navegador e devolve o arquivo, com o código no nome (não o nome da criança). */
export async function montarArquivo(dados: DadosDoRelatorio): Promise<File> {
  const bytes = await gerarRelatorio(dados, await lerLogo());
  return new File([new Uint8Array(bytes)], nomeDoRelatorio(dados), { type: 'application/pdf' });
}

/**
 * Baixa o relatório de metas (E28): primeiro registra quem baixou, depois monta o PDF no navegador
 * e o salva. Se o registro falhar, o arquivo não sai.
 */
export async function baixarRelatorio(
  assistidoId: number,
  dados: DadosDoRelatorio,
): Promise<string> {
  await registrarRelatorio(assistidoId, 'baixou');
  const arquivo = await montarArquivo(dados);
  salvarArquivo(arquivo, arquivo.name);
  return arquivo.name;
}
