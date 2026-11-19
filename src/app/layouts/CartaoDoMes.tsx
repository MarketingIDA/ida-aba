import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router';

import { focoNoAzul, pressionar } from '@/app/layouts/estilosDoMenu';
import type { Andamento } from '@/app/layouts/useResumoDoMenu';
import { cn } from '@/lib/utils';
import { formatarData, nomeDoMes, periodoAnalisado, prazoDoArquivo } from '@dominio/mes.ts';

interface Props {
  mes: string;
  destino: string;
  andamento: Andamento | null;
  aoNavegar?: (() => void) | undefined;
}

function BarraDoAndamento({ andamento }: Readonly<{ andamento: Andamento }>) {
  const fracao = andamento.feitos / Math.max(1, andamento.total);
  return (
    <span
      role="meter"
      aria-label={andamento.rotulo}
      aria-valuemin={0}
      aria-valuemax={andamento.total}
      aria-valuenow={andamento.feitos}
      className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-white/22"
    >
      <i
        className="block h-full rounded-full bg-verde"
        style={{ width: `${String(fracao * 100)}%` }}
      />
    </span>
  );
}

/**
 * Card do mês da evolução: o mês aberto, as sessões que ele analisa (E18), o andamento do mês e o
 * prazo do arquivo (E15). Leva à primeira tela do papel (todo card leva à lista do que ele conta).
 */
export function CartaoDoMes({ mes, destino, andamento, aoNavegar }: Readonly<Props>) {
  const { inicio, fim } = periodoAnalisado(mes);
  const nome = nomeDoMes(mes);
  const prazo = formatarData(prazoDoArquivo(mes), true);

  return (
    <Link
      to={destino}
      onClick={aoNavegar}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border border-white/20 bg-azul-escuro/55 px-4 py-3.5 hover:bg-azul-escuro active:scale-[0.98] [@media(max-height:760px)]:px-3.5 [@media(max-height:760px)]:py-2.5',
        pressionar,
        focoNoAzul,
      )}
    >
      <span className="flex items-center gap-1.5 rotulo">
        <CalendarDays aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        Evolução do mês
      </span>{' '}
      <span className="font-display text-[1.31rem] leading-[1.1] font-extrabold">
        {nome.charAt(0).toUpperCase() + nome.slice(1)} <span className="text-amarelo">/</span>{' '}
        {mes.slice(0, 4)}
      </span>{' '}
      <span className="-mt-1 text-xs font-bold">
        Sessões de {formatarData(inicio, true)} a {formatarData(fim, true)}
      </span>{' '}
      {andamento === null ? (
        <span className="text-[0.78rem] font-bold">Arquivo do mês até {prazo}</span>
      ) : (
        <>
          <BarraDoAndamento andamento={andamento} />{' '}
          <span className="text-[0.78rem] font-bold">
            {andamento.feitos} de {andamento.total} {andamento.rotulo} · prazo {prazo}
          </span>
        </>
      )}
    </Link>
  );
}
