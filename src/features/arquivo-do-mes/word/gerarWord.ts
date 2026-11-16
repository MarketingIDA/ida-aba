import type * as BibliotecaDocx from 'docx';
import type { IRunOptions, Paragraph } from 'docx';

import type { ConteudoDoArquivo, EvolucaoDoWord } from '@/features/arquivo-do-mes/api/conteudo.api';
import type { ImagemDoWord } from '@/features/arquivo-do-mes/word/imagemParaOWord';
import { ROTULO_DO_TURNO } from '@/utils/turno';
import { FRASE_PADRAO, textoDaEvolucao } from '@dominio/evolucao.ts';
import { nomeDoMes } from '@dominio/mes.ts';

/**
 * O Word do arquivo do mês no formato do modelo (E14): Cambria 12, espaçamento 1,5, o cabeçalho
 * uma vez, um bloco por assistido em ordem alfabética e a assinatura no fim. A biblioteca `docx`
 * só é carregada aqui, na hora de gerar: ela não pesa na abertura do sistema.
 */
type Docx = typeof BibliotecaDocx;

/** Medidas do Word: fonte em meios-pontos, espaços em vigésimos de ponto (1 cm = 567). */
const FONTE = 'Cambria';
const CORPO_12 = 24;
const ENTRELINHA_1_5 = 360;
const MARGEM = { top: 1417, bottom: 1417, left: 1134, right: 1134 };

const PREVIA =
  'Prévia para conferência. O arquivo ainda não foi enviado a contas médicas pelo sistema.';

/** "Novembro, 2026", como no modelo. */
export function mesEAno(mesRef: string): string {
  const nome = nomeDoMes(mesRef);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}, ${mesRef.slice(0, 4)}`;
}

/** `Evolucao-mensal-UNA-manha-2611.docx`; a prévia leva `-previa` no nome. */
export function nomeDoWord(conteudo: ConteudoDoArquivo): string {
  const aamm = `${conteudo.mesRef.slice(2, 4)}${conteudo.mesRef.slice(5, 7)}`;
  const previa = conteudo.enviadoEm === null ? '-previa' : '';
  return `Evolucao-mensal-${conteudo.unidadeSigla}-${conteudo.turno}-${aamm}${previa}.docx`;
}

/** Um trecho em negrito. O tipo vem anotado para o lint não confundir com `String.bold`. */
function negrito(docx: Docx, texto: string, cor?: string) {
  const opcoes: IRunOptions = { text: texto, bold: true, ...(cor !== undefined && { color: cor }) };
  return new docx.TextRun(opcoes);
}

/** "Rótulo: valor", com o rótulo em negrito. */
function campo(docx: Docx, rotulo: string, valor: string, opcoes: object = {}): Paragraph {
  return new docx.Paragraph({
    ...opcoes,
    children: [negrito(docx, `${rotulo}: `), new docx.TextRun({ text: valor })],
  });
}

function titulo(docx: Docx, texto: string): Paragraph {
  return new docx.Paragraph({
    keepNext: true,
    spacing: { before: 160 },
    children: [negrito(docx, `${texto}:`)],
  });
}

function corrido(docx: Docx, texto: string): Paragraph {
  return new docx.Paragraph({ alignment: docx.AlignmentType.JUSTIFIED, text: texto });
}

/** A lista de metas, com o marcador pequeno do Word (o padrão da biblioteca é um círculo grande). */
const LISTA = 'metas';

function lista(docx: Docx, itens: readonly string[]): Paragraph[] {
  return itens.map(
    (item) => new docx.Paragraph({ text: item, numbering: { reference: LISTA, level: 0 } }),
  );
}

function marcadores(docx: Docx) {
  return {
    config: [
      {
        reference: LISTA,
        levels: [
          {
            level: 0,
            format: docx.LevelFormat.BULLET,
            text: '•',
            alignment: docx.AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  };
}

function cabecalho(docx: Docx, conteudo: ConteudoDoArquivo): Paragraph[] {
  const aviso =
    conteudo.enviadoEm === null
      ? [
          new docx.Paragraph({
            spacing: { after: 240 },
            children: [negrito(docx, PREVIA, 'B45309')],
          }),
        ]
      : [];
  return [
    ...aviso,
    campo(docx, 'Nome do profissional', conteudo.coordenador ?? ''),
    campo(docx, 'Unidade', conteudo.unidade),
    campo(docx, 'Turno', ROTULO_DO_TURNO[conteudo.turno]),
    campo(docx, 'Especialidade', 'ABA'),
    campo(docx, 'Mês/ano', mesEAno(conteudo.mesRef)),
  ];
}

/** O bloco de um assistido; do segundo em diante, um traço o separa do anterior. */
function bloco(docx: Docx, evolucao: EvolucaoDoWord, comTraco: boolean): Paragraph[] {
  const traco = comTraco
    ? { border: { top: { style: docx.BorderStyle.SINGLE, size: 12, color: '222222', space: 10 } } }
    : {};
  return [
    campo(docx, 'Nome do assistido', evolucao.assistido.toLocaleUpperCase('pt-BR'), {
      ...traco,
      keepNext: true,
      spacing: { before: 360 },
    }),
    campo(docx, 'Plano de saúde', evolucao.plano ?? '', { keepNext: true }),
    campo(docx, 'Especialidade', 'ABA', { keepNext: true }),
    titulo(docx, 'Evolução mensal'),
    corrido(docx, textoDaEvolucao(evolucao.texto)),
    titulo(docx, 'Metas alcançadas'),
    ...lista(docx, evolucao.metasAlcancadas),
    new docx.Paragraph({
      alignment: docx.AlignmentType.JUSTIFIED,
      keepNext: true,
      spacing: { before: 160 },
      text: FRASE_PADRAO,
    }),
    ...lista(docx, evolucao.metasDoMes),
  ];
}

/** No fim, uma vez: a imagem, o traço, o nome e o CRP de quem assina. */
function assinaturaNoFim(
  docx: Docx,
  conteudo: ConteudoDoArquivo,
  imagem: ImagemDoWord | null,
): Paragraph[] {
  const centro = { alignment: docx.AlignmentType.CENTER, keepLines: true };
  const linhas = ['______________________________', conteudo.coordenador ?? ''];
  if (conteudo.crp !== null) linhas.push(`CRP ${conteudo.crp}`);
  const figura =
    imagem === null
      ? []
      : [
          new docx.ImageRun({
            type: imagem.tipo,
            data: imagem.dados,
            transformation: { width: imagem.largura, height: imagem.altura },
            altText: {
              name: 'Assinatura',
              title: 'Assinatura',
              description: `Assinatura de ${conteudo.coordenador ?? 'quem coordena'}`,
            },
          }),
        ];
  return [
    new docx.Paragraph({ ...centro, keepNext: true, spacing: { before: 720 }, children: figura }),
    ...linhas.map(
      (texto, i) => new docx.Paragraph({ ...centro, keepNext: i < linhas.length - 1, text: texto }),
    ),
  ];
}

/** Monta o `.docx` do arquivo (ou da prévia) e devolve o arquivo pronto para baixar. */
export async function gerarWord(
  conteudo: ConteudoDoArquivo,
  assinatura: ImagemDoWord | null,
): Promise<Blob> {
  const docx = await import('docx');
  const documento = new docx.Document({
    title: `Evolução mensal · ${conteudo.unidade} · ${mesEAno(conteudo.mesRef)}`,
    creator: conteudo.coordenador ?? 'Evolução ABA',
    numbering: marcadores(docx),
    styles: {
      default: {
        document: {
          run: { font: FONTE, size: CORPO_12, language: { value: 'pt-BR' } },
          paragraph: { spacing: { line: ENTRELINHA_1_5, lineRule: docx.LineRuleType.AUTO } },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: MARGEM } },
        children: [
          ...cabecalho(docx, conteudo),
          ...conteudo.evolucoes.flatMap((evolucao, i) => bloco(docx, evolucao, i > 0)),
          ...assinaturaNoFim(docx, conteudo, assinatura),
        ],
      },
    ],
  });
  return docx.Packer.toBlob(documento);
}
