import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import {
  importacaoOptions,
  leituraDeNivelOptions,
  useImportarTita,
  useLerNiveis,
} from '@/features/evolucoes/queries';
import {
  type Conferencia,
  conferirLeitura,
  type Leitura,
  lerRelatorio,
} from '@/features/evolucoes/tita/leitura';
import { lerPdf } from '@/features/evolucoes/tita/lerPdf';
import { ehErroApp, ErroApp } from '@/lib/erroApp';

/** O PDF já lido, esperando o coordenador conferir e confirmar. */
export interface LeituraPendente {
  arquivo: string;
  leitura: Leitura;
  conferencia: Conferencia;
}

export const mensagemDe = (erro: unknown, padrao: string) =>
  ehErroApp(erro) ? erro.message : padrao;

/** Lê o PDF no navegador e confere a leitura com o assistido e o mês da evolução (E03). */
export async function lerEConferir(
  arquivo: File,
  assistido: string,
  mesRef: string,
): Promise<LeituraPendente> {
  const leitura = lerRelatorio(await lerPdf(arquivo));
  if (leitura === null) {
    throw new ErroApp(
      'regra_violada',
      'Este arquivo não é o Relatório de Evoluções Diárias do Tita.',
    );
  }
  return {
    arquivo: arquivo.name,
    leitura,
    conferencia: conferirLeitura(leitura, assistido, mesRef),
  };
}

/** A leitura do nível de apoio da importação atual (E27): a situação gravada e o pedido à IA. */
function useNivelDeApoio(evolucaoId: string) {
  const consulta = useQuery(leituraDeNivelOptions(evolucaoId));
  const ler = useLerNiveis(evolucaoId);
  return {
    leitura: consulta.data ?? null,
    carregando: consulta.isPending,
    lendo: ler.isPending,
    erro: ler.isError ? mensagemDe(ler.error, 'Não foi possível ler o nível de apoio.') : null,
    ler: () => {
      ler.mutate();
    },
  };
}

/**
 * A importação do PDF do Tita na evolução: escolher o arquivo, ler no navegador, conferir (E03) e
 * só então gravar. O PDF não sai do computador; vai ao banco só o que foi lido.
 */
export function useImportacaoDoTita(evolucao: Evolucao) {
  const consulta = useQuery(importacaoOptions(evolucao.id));
  const importar = useImportarTita(evolucao.id);
  const niveis = useNivelDeApoio(evolucao.id);
  const [pendente, setPendente] = useState<LeituraPendente | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ler = async (arquivo: File) => {
    setErro(null);
    setLendo(true);
    try {
      setPendente(await lerEConferir(arquivo, evolucao.assistido, evolucao.mesRef));
    } catch (causa) {
      setErro(mensagemDe(causa, 'Não foi possível ler este PDF.'));
    } finally {
      setLendo(false);
    }
  };

  return {
    importacao: consulta.data ?? null,
    carregando: consulta.isPending,
    pendente,
    lendo,
    salvando: importar.isPending,
    erro:
      erro ?? (consulta.isError ? mensagemDe(consulta.error, 'Não foi possível carregar.') : null),
    niveis,
    escolher: (arquivo: File) => void ler(arquivo),
    confirmar: () => {
      if (pendente === null) return;
      importar.mutate(
        { arquivo: pendente.arquivo, leitura: pendente.leitura },
        {
          onSuccess: () => {
            setPendente(null);
            // Em segundo plano: a IA lê o nível de apoio do PDF novo (E27).
            niveis.ler();
          },
          onError: (causa) => {
            setErro(mensagemDe(causa, 'Não foi possível gravar a importação.'));
          },
        },
      );
    },
    cancelar: () => {
      setPendente(null);
      setErro(null);
    },
  };
}
