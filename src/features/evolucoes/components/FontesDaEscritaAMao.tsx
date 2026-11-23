import { useQuery } from '@tanstack/react-query';
import { PenLine } from 'lucide-react';
import { useState } from 'react';

import { historicoOptions } from '@/features/evolucoes/api/historico.api';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucaoId: string;
  numero: 2 | 3 | 4;
}

/** O texto escrito à mão (a primeira versão do coordenador) e, se houve, o aprimoramento da IA. */
function Escrito({ evolucaoId, numero }: Readonly<Props>) {
  const consulta = useQuery(historicoOptions(evolucaoId, numero));
  if (consulta.isPending) return <p className="mt-2 text-apagado">Carregando…</p>;
  if (consulta.isError) {
    return (
      <p role="alert" className="mt-2 font-bold text-bloq-text">
        {consulta.error.message}
      </p>
    );
  }
  // O histórico vem do mais novo ao mais antigo: a escrita à mão é a primeira do coordenador.
  const escrita = consulta.data.findLast((v) => v.autor === 'coordenador');
  if (escrita === undefined) {
    return <p className="mt-2 text-apagado">Nada escrito nesta parte ainda.</p>;
  }
  const aprimorada = consulta.data.find((v) => v.autor === 'ia');
  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="font-semibold text-texto-2">
        Escrito à mão por {escrita.criadoPor ?? 'Coordenação'}, em{' '}
        {formatarDataHora(escrita.criadoEm)}, sem o PDF do Tita nem documentos.
      </p>
      {escrita.linhas.length === 0 ? (
        <p className="text-apagado">Em branco.</p>
      ) : (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-texto">
          {escrita.linhas.map((linha, i) => (
            <li key={`${String(i)}-${linha}`}>{linha}</li>
          ))}
        </ol>
      )}
      {aprimorada !== undefined && (
        <p className="font-semibold text-texto-2">
          Aprimorado pela IA em {formatarDataHora(aprimorada.criadoEm)} a partir deste texto, sem
          fato novo. Compare em “Versões desta parte”.
        </p>
      )}
    </div>
  );
}

/**
 * As fontes da evolução escrita à mão (E26): a fonte é o que o coordenador escreveu. Fechadas por
 * padrão, e só buscam o histórico quando abertas. Contas médicas não vê (o banco devolve vazio).
 */
export function FontesDaEscritaAMao(props: Readonly<Props>) {
  const [aberto, setAberto] = useState(false);
  return (
    <details
      className="rounded-lg border border-borda px-3 py-2 text-caption"
      onToggle={(evento) => {
        setAberto(evento.currentTarget.open);
      }}
    >
      <summary className="flex cursor-pointer items-center gap-1.5 font-bold text-azul foco-anel">
        <PenLine aria-hidden="true" className="size-3.5" />
        Fontes: escrito à mão
      </summary>
      {aberto && <Escrito {...props} />}
    </details>
  );
}
