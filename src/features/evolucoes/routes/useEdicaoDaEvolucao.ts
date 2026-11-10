import { useState } from 'react';

import type {
  ConteudoDaParte,
  Evolucao,
  NumeroDaParte,
} from '@/features/evolucoes/api/evolucao.api';
import { useAlterarEvolucao } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';

const SEM_RESPOSTA = 'Não foi possível salvar agora. Tente de novo em instantes.';

const mensagem = (erro: unknown) => (ehErroApp(erro) ? erro.message : SEM_RESPOSTA);

/**
 * O que a tela da evolução faz: editar uma parte de cada vez, conferir, concluir e reabrir. O erro
 * da edição fica no formulário; o das outras ações, na barra de baixo.
 */
export function useEdicaoDaEvolucao(evolucao: Evolucao) {
  const acoes = useAlterarEvolucao(evolucao.id);
  const [editando, setEditando] = useState<NumeroDaParte | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const aoFalhar = {
    onError: (e: unknown) => {
      setErro(mensagem(e));
    },
  };
  return {
    editando,
    editar: (numero: NumeroDaParte) => {
      acoes.salvar.reset();
      setErro(null);
      setEditando(numero);
    },
    cancelar: () => {
      setEditando(null);
    },
    salvar: (parte: ConteudoDaParte) => {
      acoes.salvar.mutate(parte, {
        onSuccess: () => {
          setEditando(null);
        },
      });
    },
    salvando: acoes.salvar.isPending,
    erroDaEdicao: acoes.salvar.isError ? mensagem(acoes.salvar.error) : null,
    conferir: (numero: NumeroDaParte, conferida: boolean) => {
      setErro(null);
      acoes.conferir.mutate({ numero, conferida }, aoFalhar);
    },
    mudarSituacao: (situacao: 'concluida' | 'em_conferencia') => {
      setErro(null);
      acoes.situacao.mutate(situacao, aoFalhar);
    },
    erro,
    ocupado: acoes.salvar.isPending || acoes.conferir.isPending || acoes.situacao.isPending,
  };
}

export type EdicaoDaEvolucao = ReturnType<typeof useEdicaoDaEvolucao>;
