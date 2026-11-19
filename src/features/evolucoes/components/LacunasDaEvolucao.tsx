import { CircleCheck, EyeOff, OctagonX, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Lacuna } from '@/features/evolucoes/api/lacunas.api';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  lacunas: readonly Lacuna[];
  /** O coordenador da carteira, com a evolução em conferência e sem outra parte em edição. */
  podeResolver: boolean;
  ocupado: boolean;
  erro: string | null;
  aoNaoTrabalhado: (programa: string) => void;
  aoTrabalhado: () => void;
  aoIgnorar: (programa: string) => void;
}

/** A frase que entra no texto quando o programa não foi trabalhado no mês (E10). */
export const fraseDeNaoTrabalhado = (programa: string) =>
  `O programa ${programa} não foi aplicado no período.`;

function SituacaoDaLacuna({ lacuna }: Readonly<{ lacuna: Lacuna }>) {
  if (lacuna.situacao === 'resolvida') {
    return (
      <span className="flex items-center gap-1 text-ok-text">
        <CircleCheck aria-hidden="true" className="size-4" />
        Resolvida: o texto cita o programa
      </span>
    );
  }
  if (lacuna.situacao === 'ignorada') {
    const quem = lacuna.ignoradaPor === null ? '' : ` por ${lacuna.ignoradaPor}`;
    const quando = lacuna.ignoradaEm === null ? '' : ` em ${formatarDataHora(lacuna.ignoradaEm)}`;
    return (
      <span className="flex items-center gap-1 text-texto-2">
        <EyeOff aria-hidden="true" className="size-4" />
        Ignorada{quem}
        {quando}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-bloq-text">
      <OctagonX aria-hidden="true" className="size-4" />
      Não aparece nas análises
    </span>
  );
}

function AcoesDaLacuna({
  lacuna,
  ...props
}: Readonly<Omit<Props, 'lacunas'> & { lacuna: Lacuna }>) {
  return (
    <span className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={props.ocupado}
        onClick={() => {
          props.aoNaoTrabalhado(lacuna.programa);
        }}
      >
        <X aria-hidden="true" />
        Não foi trabalhado
      </Button>
      <Button variant="secondary" size="sm" disabled={props.ocupado} onClick={props.aoTrabalhado}>
        <Pencil aria-hidden="true" />
        Foi trabalhado
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={props.ocupado}
        onClick={() => {
          props.aoIgnorar(lacuna.programa);
        }}
      >
        <EyeOff aria-hidden="true" />
        Ignorar
      </Button>
    </span>
  );
}

/**
 * As lacunas da evolução mensal (E10): os programas do plano que as análises não citam. Aberta,
 * bloqueia a conclusão; "Foi trabalhado" abre o texto para o coordenador escrever sobre o programa.
 */
export function LacunasDaEvolucao(props: Readonly<Props>) {
  if (props.lacunas.length === 0) return null;
  return (
    <section
      aria-labelledby="lacunas"
      className="flex flex-col gap-2 rounded-lg border border-borda bg-neutro-suave px-3 py-3"
    >
      <h3 id="lacunas" className="text-caption font-bold">
        Lacunas: programas do plano que não aparecem nas análises
      </h3>
      <ul className="flex flex-col gap-2">
        {props.lacunas.map((lacuna) => (
          <li
            key={lacuna.programa}
            className="flex flex-col gap-2 rounded-md bg-superficie px-3 py-2 text-caption font-semibold"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{lacuna.programa}</span>
              <SituacaoDaLacuna lacuna={lacuna} />
            </span>
            {props.podeResolver && lacuna.situacao === 'aberta' && (
              <AcoesDaLacuna lacuna={lacuna} {...props} />
            )}
          </li>
        ))}
      </ul>
      {props.erro !== null && (
        <p role="alert" className="text-caption font-semibold text-bloq-text">
          {props.erro}
        </p>
      )}
    </section>
  );
}
