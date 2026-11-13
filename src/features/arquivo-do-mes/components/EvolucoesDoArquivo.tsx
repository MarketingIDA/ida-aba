import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import type { EvolucaoDoArquivo } from '@/features/arquivo-do-mes/api/arquivos.api';
import { evolucoes } from '@/features/arquivo-do-mes/logica';
import { evolucoesDoArquivoOptions } from '@/features/arquivo-do-mes/queries';
import { ehErroApp } from '@/lib/erroApp';
import { cn } from '@/lib/utils';

interface Props {
  arquivoId: number;
  total: number;
  /** Quem abre a evolução (coordenador e coordenação geral) ganha o link; contas médicas, não. */
  comLink: boolean;
}

function Linha({ evolucao, comLink }: Readonly<{ evolucao: EvolucaoDoArquivo; comLink: boolean }>) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-sm">
      <b className="text-marinho">
        {comLink ? (
          <Link to={`/evolucoes/${evolucao.id}`} className="rounded-sm foco-anel hover:underline">
            {evolucao.assistido}
          </Link>
        ) : (
          evolucao.assistido
        )}
      </b>
      <span className="font-mono text-xs text-texto-2">{evolucao.codigo}</span>
      <span className="text-caption font-semibold text-apagado">
        {evolucao.plano ?? 'plano em branco'}
      </span>
    </li>
  );
}

/** As evoluções que o arquivo levou, em ordem alfabética (E14); só carrega quando abre. */
export function EvolucoesDoArquivo({ arquivoId, total, comLink }: Readonly<Props>) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const consulta = useQuery({ ...evolucoesDoArquivoOptions(arquivoId), enabled: aberto });
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => {
          setAberto(!aberto);
        }}
        className="flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-sm text-caption font-bold text-azul foco-anel hover:underline"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 transition-transform duration-150 motion-reduce:transition-none',
            aberto && 'rotate-180',
          )}
        />
        {aberto ? 'Ocultar as evoluções' : `Ver ${evolucoes(total)}`}
      </button>
      <div id={id} hidden={!aberto}>
        {aberto && consulta.isPending && (
          <p role="status" className="text-sm text-apagado">
            Carregando as evoluções…
          </p>
        )}
        {consulta.isError && (
          <p role="alert" className="text-sm font-bold text-bloq-text">
            {ehErroApp(consulta.error)
              ? consulta.error.message
              : 'Não foi possível carregar as evoluções.'}
          </p>
        )}
        {consulta.isSuccess && (
          <ul aria-label="Evoluções do arquivo" className="divide-y divide-borda">
            {consulta.data.map((evolucao) => (
              <Linha key={evolucao.id} evolucao={evolucao} comLink={comLink} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
