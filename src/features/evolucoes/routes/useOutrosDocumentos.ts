import { useQuery } from '@tanstack/react-query';
import { type Dispatch, type SetStateAction, useState } from 'react';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { lerDocumento } from '@/features/evolucoes/documentos/lerDocumento';
import { documentosOptions, useAlterarDocumentos } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';
import { conferirDocumento, type DocumentoConferido } from '@dominio/documentos.ts';
import type { Genero } from '@dominio/pseudonimo.ts';
import { hojeNaClinica } from '@dominio/mes.ts';

const mensagemDe = (erro: unknown, padrao: string) => (ehErroApp(erro) ? erro.message : padrao);

const BLOQUEIO =
  'Há documento sem o nome do assistido esperando a sua confirmação. Confirme ou tire da lista para gerar o rascunho.';

/**
 * Lê e confere os arquivos um por um: com o nome do assistido no texto, o documento é gravado na
 * hora; sem o nome, vai para os pendentes. O erro de um arquivo não para os outros.
 */
async function lerArquivos(
  arquivos: File[],
  assistido: { nome: string; genero: Genero },
  acoes: {
    gravar: (documento: DocumentoConferido) => Promise<void>;
    pendente: (documento: DocumentoConferido) => void;
    erro: (mensagem: string) => void;
  },
) {
  const hoje = hojeNaClinica(new Date());
  for (const arquivo of arquivos) {
    try {
      const conferido = conferirDocumento(await lerDocumento(arquivo), assistido, hoje);
      if (conferido.trocas === 0) acoes.pendente(conferido);
      else await acoes.gravar(conferido);
    } catch (causa) {
      acoes.erro(mensagemDe(causa, `${arquivo.name}: não foi possível juntar o documento.`));
    }
  }
}

/**
 * A leitura dos arquivos escolhidos e os documentos que esperam confirmação. O erro de cada arquivo
 * entra na lista de erros da tela.
 */
function useLeitura(
  evolucao: Evolucao,
  juntar: ReturnType<typeof useAlterarDocumentos>['juntar'],
  setErros: Dispatch<SetStateAction<string[]>>,
) {
  const [pendentes, setPendentes] = useState<DocumentoConferido[]>([]);
  const [lendo, setLendo] = useState(false);
  const assistido = { nome: evolucao.assistido, genero: evolucao.genero ?? 'masculino' };

  const escolher = async (arquivos: File[]) => {
    setErros([]);
    setLendo(true);
    await lerArquivos(arquivos, assistido, {
      gravar: (documento) => juntar.mutateAsync({ documento, confirmado: false }),
      pendente: (documento) => {
        setPendentes((atual) => [...atual, documento]);
      },
      erro: (mensagem) => {
        setErros((atual) => [...atual, mensagem]);
      },
    });
    setLendo(false);
  };

  return {
    pendentes,
    lendo,
    escolher: (arquivos: File[]) => void escolher(arquivos),
    tirar: (alvo: DocumentoConferido) => {
      setPendentes((atual) => atual.filter((p) => p !== alvo));
    },
  };
}

/**
 * Os outros documentos da evolução (E25). Cada arquivo é lido no navegador e conferido; o que não
 * tem o nome do assistido espera o coordenador confirmar ou tirar da lista. Enquanto houver
 * documento esperando, o rascunho não é gerado.
 */
export function useOutrosDocumentos(evolucao: Evolucao) {
  const consulta = useQuery(documentosOptions(evolucao.id));
  const { juntar, alterar } = useAlterarDocumentos(evolucao.id);
  const [erros, setErros] = useState<string[]>([]);
  const leitura = useLeitura(evolucao, juntar, setErros);
  const falhou = (padrao: string) => (causa: unknown) => {
    setErros([mensagemDe(causa, padrao)]);
  };

  return {
    documentos: consulta.data ?? [],
    carregando: consulta.isPending,
    pendentes: leitura.pendentes,
    lendo: leitura.lendo,
    ocupado: leitura.lendo || juntar.isPending || alterar.isPending,
    erros: consulta.isError
      ? [...erros, mensagemDe(consulta.error, 'Não foi possível carregar os documentos.')]
      : erros,
    /** O motivo de o rascunho não poder ser gerado agora, ou `null`. */
    bloqueio: leitura.pendentes.length > 0 ? BLOQUEIO : null,
    escolher: leitura.escolher,
    confirmar: (alvo: DocumentoConferido) => {
      setErros([]);
      juntar.mutate(
        { documento: alvo, confirmado: true },
        {
          onSuccess: () => {
            leitura.tirar(alvo);
          },
          onError: falhou('Não foi possível juntar o documento.'),
        },
      );
    },
    descartar: leitura.tirar,
    mudar: (id: number, mudanca: Parameters<typeof alterar.mutate>[0]['mudanca']) => {
      setErros([]);
      alterar.mutate({ id, mudanca }, { onError: falhou('Não foi possível alterar o documento.') });
    },
  };
}

export type OutrosDocumentos = ReturnType<typeof useOutrosDocumentos>;
