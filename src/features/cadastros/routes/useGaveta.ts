import { useState } from 'react';

/**
 * Estado da gaveta de cadastro: fechada, aberta para um novo (`item` nulo) ou aberta para alterar
 * um item. O item fica guardado ao fechar, para o título não trocar durante a animação de saída.
 */
export function useGaveta<Item>() {
  const [aberta, setAberta] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  return {
    aberta,
    item,
    abrirNovo: () => {
      setItem(null);
      setAberta(true);
    },
    abrirEdicao: (escolhido: Item) => {
      setItem(escolhido);
      setAberta(true);
    },
    fechar: () => {
      setAberta(false);
    },
  };
}
