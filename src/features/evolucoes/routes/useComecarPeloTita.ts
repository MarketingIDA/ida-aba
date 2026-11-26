import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { criarEvolucao } from '@/features/evolucoes/api/evolucao.api';
import { gravarImportacao } from '@/features/evolucoes/api/importacao.api';
import { lerNiveis } from '@/features/evolucoes/api/niveis.api';
import { evolucoesKeys } from '@/features/evolucoes/queries';
import {
  type LeituraPendente,
  lerEConferir,
  mensagemDe,
} from '@/features/evolucoes/routes/useImportacaoDoTita';

/** Criar a evolução, pela leitura do PDF ou à mão, e abrir a tela dela. */
function useCriar(assistidoId: number, aoFalhar: (mensagem: string) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const abrir = async (id: string) => {
    await queryClient.invalidateQueries({ queryKey: evolucoesKeys.all });
    await navigate(`/evolucoes/${id}`);
  };

  const pelaLeitura = useMutation({
    mutationFn: async (lida: LeituraPendente) => {
      const id = await criarEvolucao(assistidoId);
      try {
        await gravarImportacao(id, lida.arquivo, lida.leitura);
      } catch (causa) {
        // A evolução já existe: abre a tela dela, onde o PDF pode ser importado de novo.
        await abrir(id);
        throw causa;
      }
      return id;
    },
    onSuccess: async (id) => {
      // Em segundo plano: a IA lê o nível de apoio do PDF (E27); falhar aqui não impede nada.
      lerNiveis(id).catch(() => undefined);
      await abrir(id);
    },
    onError: (causa) => {
      aoFalhar(mensagemDe(causa, 'Não foi possível criar a evolução com esta leitura.'));
    },
  });

  const aMao = useMutation({
    mutationFn: () => criarEvolucao(assistidoId),
    onSuccess: abrir,
    onError: (causa) => {
      aoFalhar(mensagemDe(causa, 'Não foi possível criar agora.'));
    },
  });
  return { pelaLeitura, aMao };
}

/**
 * Começar a evolução mensal pelo PDF do Tita (E01, E02): o PDF é lido e conferido antes de a
 * evolução existir; só "Usar esta leitura" cria a evolução, grava a importação e abre a tela dela.
 * Sem relatório, a escrita à mão (E26) cria a evolução sem importação.
 */
export function useComecarPeloTita(assistidoId: number, assistido: string, mesRef: string) {
  const [pendente, setPendente] = useState<LeituraPendente | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { pelaLeitura, aMao } = useCriar(assistidoId, setErro);

  const ler = async (arquivo: File) => {
    setErro(null);
    setLendo(true);
    try {
      setPendente(await lerEConferir(arquivo, assistido, mesRef));
    } catch (causa) {
      setErro(mensagemDe(causa, 'Não foi possível ler este PDF.'));
    } finally {
      setLendo(false);
    }
  };

  return {
    pendente,
    lendo,
    salvando: pelaLeitura.isPending,
    criandoAMao: aMao.isPending,
    erro,
    escolher: (arquivo: File) => void ler(arquivo),
    confirmar: () => {
      if (pendente !== null) pelaLeitura.mutate(pendente);
    },
    cancelar: () => {
      setPendente(null);
      setErro(null);
    },
    escreverAMao: () => {
      setErro(null);
      aMao.mutate();
    },
  };
}
