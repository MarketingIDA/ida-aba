import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';

import { Seletor } from '@/components/Seletor';
import { formatarMesCurto } from '@dominio/mes.ts';

interface Props {
  mes: string;
  mesAberto: string;
  /** Do mais novo ao mais antigo; o primeiro é o mês aberto. */
  meses: readonly string[];
  subtitulo: string;
  aoMudarMes: (mes: string) => void;
  /** Ao lado da escolha do mês: a ação principal da tela, quando há. */
  acao?: ReactNode;
}

/** Título com a pílula amarela do mês, o resumo do período e a escolha do mês. */
export function CabecalhoDoMes(props: Readonly<Props>) {
  const { mes, mesAberto, meses, subtitulo, aoMudarMes, acao } = props;
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-[72ch] flex-col gap-1.5">
        <p className="flex items-center gap-2 rotulo text-azul">
          <FileText aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Evoluções mensais
        </p>
        <h1>
          Evoluções{' '}
          <span className="ml-1 inline-block -rotate-2 rounded-full bg-amarelo px-4 pt-[3px] align-[5px] text-[1.0625rem] whitespace-nowrap text-marinho shadow-3d-amarelo">
            {formatarMesCurto(mes)}
          </span>
        </h1>
        <p className="text-sm font-semibold text-texto-2">{subtitulo}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-texto-2">
          Mês
          <Seletor
            value={mes}
            onChange={(evento) => {
              aoMudarMes(evento.target.value);
            }}
            className="w-auto"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {formatarMesCurto(m)}
                {m === mesAberto ? ' · aberta' : ''}
              </option>
            ))}
          </Seletor>
        </label>
        {acao}
      </div>
    </header>
  );
}
