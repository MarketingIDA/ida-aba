import type {
  ConteudoDoArquivo,
  EvolucaoDoArquivo,
} from '@/features/arquivo-do-mes/api/conteudo.api';
import {
  COR,
  corrido,
  criarFolha,
  emUmaLinha,
  type Folha,
  lista,
  MARGEM,
  RODAPE,
  rotulo,
  titulo,
  UTIL,
} from '@/features/arquivo-do-mes/pdf/folha';
import type { ImagemDaAssinatura } from '@/features/arquivo-do-mes/pdf/imagemDaAssinatura';
import { LARGURA } from '@/features/progresso/pdf/desenho';
import { quebrarLinhas } from '@/features/progresso/pdf/texto';
import { ROTULO_DO_TURNO } from '@/utils/turno';
import { FRASE_PADRAO, textoDaEvolucao } from '@dominio/evolucao.ts';
import { nomeDoMes } from '@dominio/mes.ts';

/**
 * O PDF do arquivo do mês (E14) sobre o papel timbrado do Instituto. O cabeçalho sai uma vez, num
 * quadro; cada assistido abre com uma faixa, em ordem alfabética; a assinatura fica no fim. É
 * montado no navegador de quem baixa, com a biblioteca `pdf-lib` e a arte carregadas só nessa hora.
 */
const PREVIA =
  'Prévia para conferência. O arquivo ainda não foi enviado a contas médicas pelo sistema.';
const CONFERENCIA =
  'Evolução de um assistido, só para conferência. Não vai a contas médicas: o que vai é o arquivo do mês da carteira.';

/** O aviso no topo: a evolução sozinha, a prévia do arquivo ou nenhum, no arquivo enviado. */
function avisoDo(conteudo: ConteudoDoArquivo): string | null {
  if (conteudo.conferencia === true) return CONFERENCIA;
  return conteudo.enviadoEm === null ? PREVIA : null;
}

/** "Novembro, 2026", como no modelo. */
export function mesEAno(mesRef: string): string {
  const nome = nomeDoMes(mesRef);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}, ${mesRef.slice(0, 4)}`;
}

/** `Evolucao-mensal-UNA-manha-2611.pdf`; a prévia leva `-previa` no nome. */
export function nomeDoPdf(conteudo: ConteudoDoArquivo): string {
  const aamm = `${conteudo.mesRef.slice(2, 4)}${conteudo.mesRef.slice(5, 7)}`;
  const previa = conteudo.enviadoEm === null ? '-previa' : '';
  return `Evolucao-mensal-${conteudo.unidadeSigla}-${conteudo.turno}-${aamm}${previa}.pdf`;
}

/** O aviso da prévia ou da conferência, num quadro âmbar com a barra à esquerda. */
function aviso(f: Folha, texto: string) {
  const tam = 8.5;
  const linhas = quebrarLinhas(texto, UTIL - 28, (s) => f.d.largura(s, tam, true));
  const altura = linhas.length * 12 + 14;
  f.d.retangulo(MARGEM, f.y, UTIL, altura, COR.ambarClaro);
  f.d.retangulo(MARGEM, f.y, 3, altura, COR.ambar);
  linhas.forEach((linha, i) => {
    f.d.texto(linha, MARGEM + 14, f.y + 16 + i * 12, { tam, negrito: true, cor: COR.ambar });
  });
  f.y += altura + 18;
}

/** O rótulo em cima e o valor embaixo, numa coluna de um quadro. */
function dado(
  f: Folha,
  nome: string,
  valor: string,
  onde: { x: number; y: number; largura: number },
  cores: { rotulo: string; valor: string; tam?: number },
) {
  const tam = cores.tam ?? 10.5;
  rotulo(f, nome, onde.x, onde.y, cores.rotulo);
  const texto = emUmaLinha(f, valor, onde.largura, tam);
  f.d.texto(texto, onde.x, onde.y + 14, { tam, negrito: true, cor: cores.valor });
}

/** O título do documento e o quadro com quem assina, a unidade, o turno e o mês. */
function cabecalho(f: Folha, conteudo: ConteudoDoArquivo) {
  const texto = avisoDo(conteudo);
  if (texto !== null) aviso(f, texto);
  const mes = mesEAno(conteudo.mesRef);
  rotulo(f, 'Terapia ABA · Relatório do período', MARGEM, f.y + 8, COR.azul, 7.5);
  f.d.texto('Evolução mensal', MARGEM, f.y + 36, { tam: 26, negrito: true, cor: COR.marinho });
  f.d.texto(mes, MARGEM, f.y + 54, { tam: 11.5, cor: COR.apagado });
  f.y += 70;

  const altura = 78;
  const coluna = UTIL / 3;
  f.d.retangulo(MARGEM, f.y, UTIL, altura, COR.azulClaro);
  f.d.retangulo(MARGEM, f.y, 3, altura, COR.azul);
  const cores = { rotulo: COR.apagado, valor: COR.marinho };
  // Cada dado com a linha, a coluna onde começa e quantas colunas ocupa: o nome de quem assina
  // costuma ser longo e leva duas.
  const dados = [
    ['Nome do profissional', conteudo.coordenador ?? '', 0, 0, 2],
    ['Mês/ano', mes, 0, 2, 1],
    ['Unidade', conteudo.unidade, 1, 0, 1],
    ['Turno', ROTULO_DO_TURNO[conteudo.turno], 1, 1, 1],
    ['Especialidade', 'ABA', 1, 2, 1],
  ] as const;
  for (const [nome, valor, linha, inicio, colunas] of dados) {
    const x = MARGEM + 16 + inicio * coluna;
    dado(f, nome, valor, { x, y: f.y + 20 + linha * 33, largura: colunas * coluna - 22 }, cores);
  }
  f.y += altura;
}

/**
 * A faixa que abre o bloco do assistido: o nome, o plano e a especialidade. O nome nunca é cortado:
 * o que não cabe numa linha continua na de baixo, e a faixa cresce.
 */
function faixa(f: Folha, evolucao: EvolucaoDoArquivo) {
  const cores = { rotulo: COR.naFaixa, valor: COR.branco };
  const doNome = UTIL * 0.54;
  const daEspecialidade = 82;
  const tam = 12;
  const nome = quebrarLinhas(evolucao.assistido.toLocaleUpperCase('pt-BR'), doNome - 26, (s) =>
    f.d.largura(s, tam, true),
  );
  const altura = 48 + (nome.length - 1) * 15;
  f.d.retangulo(MARGEM, f.y, UTIL, altura, COR.marinho);
  f.d.retangulo(MARGEM, f.y, 4, altura, COR.azul);
  const y = f.y + 19;
  rotulo(f, 'Nome do assistido', MARGEM + 16, y, cores.rotulo);
  nome.forEach((linha, i) => {
    f.d.texto(linha, MARGEM + 16, y + 14 + i * 15, { tam, negrito: true, cor: cores.valor });
  });
  const doPlano = UTIL - doNome - daEspecialidade;
  const plano = { x: MARGEM + doNome, y, largura: doPlano - 12 };
  dado(f, 'Plano de saúde', evolucao.plano ?? '—', plano, cores);
  const especialidade = { x: MARGEM + UTIL - daEspecialidade, y, largura: daEspecialidade - 10 };
  dado(f, 'Especialidade', 'ABA', especialidade, cores);
  f.y += altura;
}

/** O bloco de um assistido: a faixa, o texto e as metas. A faixa não fica sozinha no fim da página. */
function bloco(f: Folha, evolucao: EvolucaoDoArquivo) {
  f.y += 24;
  f.garantir(150);
  faixa(f, evolucao);
  titulo(f, 'Evolução mensal');
  corrido(f, textoDaEvolucao(evolucao.texto));
  titulo(f, 'Metas alcançadas');
  lista(f, evolucao.metasAlcancadas, COR.verde);
  titulo(f, 'Metas para o mês atual');
  corrido(f, FRASE_PADRAO);
  f.y += 4;
  lista(f, evolucao.metasDoMes, COR.azul);
}

/** No fim, uma vez e sem quebrar: a imagem, o traço, o nome e o CRP de quem assina. */
async function assinaturaNoFim(
  f: Folha,
  conteudo: ConteudoDoArquivo,
  imagem: ImagemDaAssinatura | null,
) {
  if (conteudo.conferencia === true) return;
  const centro = LARGURA / 2;
  const caixa = { width: 165, height: 45 };
  f.garantir(caixa.height + 84);
  f.y += 34;
  if (imagem !== null) {
    const figura =
      imagem.tipo === 'png'
        ? await f.d.doc.embedPng(imagem.dados)
        : await f.d.doc.embedJpg(imagem.dados);
    const pagina = f.d.pagina();
    const y = pagina.getHeight() - f.y - caixa.height;
    pagina.drawImage(figura, { x: centro - caixa.width / 2, y, ...caixa });
  }
  f.y += caixa.height + 6;
  f.d.linha(
    [
      [centro - 105, f.y],
      [centro + 105, f.y],
    ],
    COR.apagado,
    0.7,
  );
  const meio = { alinhar: 'centro' } as const;
  f.d.texto(conteudo.coordenador ?? '', centro, f.y + 15, { ...meio, tam: 11, negrito: true });
  if (conteudo.crp !== null) {
    f.d.texto(`CRP ${conteudo.crp}`, centro, f.y + 28, { ...meio, tam: 9, cor: COR.apagado });
  }
  f.y += 34;
}

/** O rodapé de todas as páginas, acima da faixa da arte: o que é o documento e a página. */
function rodapes(f: Folha, conteudo: ConteudoDoArquivo) {
  const total = f.d.paginas.length;
  const documento = `Evolução mensal · ${conteudo.unidade} · ${mesEAno(conteudo.mesRef)}`;
  f.d.paginas.forEach((pagina, i) => {
    f.d.irPara(pagina);
    const texto = `${documento} · Página ${String(i + 1)} de ${String(total)}`;
    f.d.texto(texto, LARGURA / 2, RODAPE, { tam: 7, cor: COR.apagado, alinhar: 'centro' });
  });
}

/** Monta o PDF do arquivo (ou da prévia) e devolve o arquivo pronto para baixar. */
export async function gerarPdf(
  conteudo: ConteudoDoArquivo,
  assinatura: ImagemDaAssinatura | null,
): Promise<Blob> {
  const [lib, { papelTimbrado }] = await Promise.all([
    import('pdf-lib'),
    import('@/features/arquivo-do-mes/pdf/papelTimbrado'),
  ]);
  const doc = await lib.PDFDocument.create();
  const f = await criarFolha(lib, doc, papelTimbrado());
  cabecalho(f, conteudo);
  for (const evolucao of conteudo.evolucoes) bloco(f, evolucao);
  await assinaturaNoFim(f, conteudo, assinatura);
  rodapes(f, conteudo);
  // O título não leva o nome de nenhum assistido (E05).
  doc.setTitle(`Evolução mensal · ${conteudo.unidade} · ${mesEAno(conteudo.mesRef)}`, {
    showInWindowTitleBar: true,
  });
  doc.setAuthor(conteudo.coordenador ?? 'Instituto do Autismo');
  doc.setCreator('Evolução ABA');
  doc.setProducer('Evolução ABA');
  doc.setLanguage('pt-BR');
  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' });
}
