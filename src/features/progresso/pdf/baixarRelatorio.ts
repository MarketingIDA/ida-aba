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

/**
 * Baixa o relatório de metas (E28): primeiro registra quem baixou, depois monta o PDF no navegador
 * e o salva. Se o registro falhar, o arquivo não sai.
 */
export async function baixarRelatorio(
  assistidoId: number,
  dados: DadosDoRelatorio,
): Promise<string> {
  await registrarRelatorio(assistidoId, 'baixou');
  const bytes = await gerarRelatorio(dados, await lerLogo());
  const nome = nomeDoRelatorio(dados);
  salvarArquivo(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), nome);
  return nome;
}
