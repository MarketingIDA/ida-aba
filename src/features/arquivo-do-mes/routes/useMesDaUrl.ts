import { useSearchParams } from 'react-router';

import { textoDoPrazo } from '@/utils/textos';
import {
  diasAtePrazo,
  formatarData,
  hojeNaClinica,
  mesDaEvolucao,
  mesesRecentes,
  prazoDoArquivo,
} from '@dominio/mes.ts';

/** Quantos meses a escolha do mês oferece, do aberto para trás. */
const MESES_NA_ESCOLHA = 6;

/**
 * O mês da tela mora na URL (`?mes=`): dá para voltar, recarregar e mandar o link. Valor inválido
 * vira o mês aberto. Devolve também o prazo do arquivo (E15), já em texto.
 */
export function useMesDaUrl() {
  const [params, setParams] = useSearchParams();
  const hoje = hojeNaClinica(new Date());
  const mesAberto = mesDaEvolucao(hoje);
  const meses = mesesRecentes(mesAberto, MESES_NA_ESCOLHA);
  const pedido = params.get('mes') ?? '';
  const mes = meses.includes(pedido) ? pedido : mesAberto;
  const dia = formatarData(prazoDoArquivo(mes), true);

  return {
    mes,
    mesAberto,
    meses,
    aberto: mes === mesAberto,
    prazo:
      mes === mesAberto
        ? `Prazo: ${dia} (${textoDoPrazo(diasAtePrazo(hoje, mes))}).`
        : `O prazo foi ${dia}.`,
    mudar: (novo: string) => {
      setParams(novo === mesAberto ? {} : { mes: novo });
    },
  };
}
