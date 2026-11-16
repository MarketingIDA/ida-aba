import { useState } from 'react';

import type { AssistidoNaTela } from '@/features/cadastros/assistidos';
import type { MarcacaoDaLista } from '@/features/cadastros/components/ListaDoCadastro';
import { vaiEmLote } from '@/features/cadastros/rascunhos';

/**
 * Os rascunhos marcados para ir em lote a uma carteira. A marcação fica de uma busca para outra
 * (procurar um nome, marcar, procurar o próximo); valem só os que ainda são rascunho com gênero.
 */
export function useMarcacao(assistidos: readonly AssistidoNaTela[]) {
  const [ids, setIds] = useState<ReadonlySet<number>>(() => new Set());
  const marcar = (id: number, marcado: boolean) => {
    setIds((antes) => {
      const depois = new Set(antes);
      if (marcado) depois.add(id);
      else depois.delete(id);
      return depois;
    });
  };
  return {
    marcados: assistidos.filter((a) => ids.has(a.id) && vaiEmLote(a)),
    marcado: (id: number) => ids.has(id),
    marcar,
    marcarTodos: (lista: readonly AssistidoNaTela[]) => {
      setIds((antes) => new Set([...antes, ...lista.filter(vaiEmLote).map((a) => a.id)]));
    },
    limpar: () => {
      setIds(new Set());
    },
  };
}

export type Marcacao = ReturnType<typeof useMarcacao>;

/** A caixa de cada linha da lista filtrada: só o rascunho com gênero pode ser marcado. */
export function marcacaoDaLista(
  marcacao: Marcacao,
  lista: readonly AssistidoNaTela[],
): MarcacaoDaLista {
  const podem = new Set(lista.filter(vaiEmLote).map((a) => a.id));
  return {
    marcado: marcacao.marcado,
    podeMarcar: (id) => podem.has(id),
    aoMarcar: marcacao.marcar,
  };
}
