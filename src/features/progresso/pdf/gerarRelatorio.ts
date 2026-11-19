import {
  ALTURA,
  COR,
  criarDesenho,
  type Desenho,
  LARGURA,
  MARGEM,
} from '@/features/progresso/pdf/desenho';
import { paginasDasEscadas } from '@/features/progresso/pdf/escadas';
import { paginaDeResumo } from '@/features/progresso/pdf/resumo';
import { paginasDasTabelas } from '@/features/progresso/pdf/tabelas';
import type { DadosDoRelatorio } from '@/features/progresso/pdf/tipos';
import { filtrarProgresso } from '@dominio/progresso.ts';

/**
 * O relatório de metas em PDF (E28), montado no navegador de quem baixa com a biblioteca
 * `pdf-lib`, carregada só nessa hora. Leva tudo o que a tela mostra, sempre sem filtro, com os
 * mesmos números: o resumo, a escada de cada meta e as tabelas. Texto selecionável, e cada página
 * diz quem emitiu, quando e que o documento tem dados de saúde de uma criança.
 */

/** O código do relatório, a partir do código da evolução mais recente: `TST-2611-002-METAS`. */
export const codigoDoRelatorio = (codigoDaEvolucao: string): string =>
  `${codigoDaEvolucao.replace(/-EV$/, '')}-METAS`;

/** O nome do arquivo leva o código, não o nome da criança (E05). */
export const nomeDoRelatorio = (dados: Pick<DadosDoRelatorio, 'codigo'>): string =>
  `${dados.codigo}.pdf`;

const FUSO = 'America/Recife';

export function textoDeEmissao(dados: Pick<DadosDoRelatorio, 'emitidoEm' | 'emitidoPor'>) {
  const dia = dados.emitidoEm.toLocaleDateString('pt-BR', { timeZone: FUSO });
  const hora = dados.emitidoEm.toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Emitido em ${dia} às ${hora} por ${dados.emitidoPor}`;
}

/** O rodapé de todas as páginas: o código, o aviso de dados de saúde, a página e quem emitiu. */
function rodapes(d: Desenho, codigo: string, emitido: string) {
  const total = d.paginas.length;
  d.paginas.forEach((pagina, i) => {
    d.irPara(pagina);
    const y = ALTURA - 36;
    const largura: [number, number][] = [
      [MARGEM, y - 12],
      [LARGURA - MARGEM, y - 12],
    ];
    d.linha(largura, COR.linha, 0.5);
    const op = { tam: 7, cor: COR.apagado };
    d.texto(`Instituto do Autismo · Evolução das metas · ${codigo}`, MARGEM, y, op);
    const aviso = 'Dados de saúde de uma criança: uso restrito a quem acompanha o caso (LGPD).';
    d.texto(aviso, MARGEM, y + 10, op);
    const direita = { ...op, alinhar: 'direita' } as const;
    const pag = `Página ${String(i + 1)} de ${String(total)}`;
    d.texto(pag, LARGURA - MARGEM, y, { ...direita, negrito: true });
    d.texto(emitido, LARGURA - MARGEM, y + 10, direita);
  });
}

/** Monta o PDF e devolve os bytes. `logo` é o PNG da marca; sem ele, vai o nome do instituto. */
export async function gerarRelatorio(
  dados: DadosDoRelatorio,
  logo: Uint8Array | null,
): Promise<Uint8Array> {
  const lib = await import('pdf-lib');
  const doc = await lib.PDFDocument.create();
  const fontes = {
    normal: await doc.embedFont(lib.StandardFonts.Helvetica),
    negrito: await doc.embedFont(lib.StandardFonts.HelveticaBold),
  };
  const imagem = logo === null ? null : await doc.embedPng(logo);
  const d = criarDesenho(lib, doc, fontes);
  const emitido = textoDeEmissao(dados);
  const metas = filtrarProgresso(dados.progresso.metas, null);
  paginaDeResumo(d, dados, imagem, emitido);
  paginasDasEscadas(d, dados, metas);
  paginasDasTabelas(d, dados, metas);
  rodapes(d, dados.codigo, emitido);
  doc.setTitle(`Evolução das metas · ${dados.nome}`, { showInWindowTitleBar: true });
  doc.setAuthor(dados.emitidoPor);
  doc.setSubject(`Relatório de evolução das metas ${dados.codigo}`);
  doc.setCreator('Evolução ABA');
  doc.setProducer('Evolução ABA');
  doc.setCreationDate(dados.emitidoEm);
  return doc.save();
}
