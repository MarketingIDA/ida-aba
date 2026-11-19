import { useQuery } from '@tanstack/react-query';
import { Columns2, History } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { historicoOptions, type VersaoDoHistorico } from '@/features/evolucoes/api/historico.api';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucaoId: string;
  numero: 2 | 3 | 4;
}

const quemFez = (versao: VersaoDoHistorico) =>
  versao.autor === 'ia' ? 'IA' : (versao.criadoPor ?? 'Coordenação');

/** O conteúdo de uma versão: os trechos em parágrafos (parte 2) ou as metas em lista (3 e 4). */
function Linhas({ linhas, metas }: Readonly<{ linhas: readonly string[]; metas: boolean }>) {
  if (linhas.length === 0) return <p className="text-apagado">Vazia.</p>;
  if (metas) {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {linhas.map((linha, i) => (
          <li key={`${String(i)}-${linha}`}>{linha}</li>
        ))}
      </ul>
    );
  }
  return (
    <>
      {linhas.map((linha, i) => (
        <p key={`${String(i)}-${linha}`}>{linha}</p>
      ))}
    </>
  );
}

/** Uma coluna da comparação: o título, de quem e quando, e o conteúdo. */
function Coluna({
  titulo,
  versao,
  metas,
}: Readonly<{ titulo: string; versao: VersaoDoHistorico; metas: boolean }>) {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-3"
    >
      <h3 className="text-caption font-bold text-texto">
        {titulo}{' '}
        <span className="font-semibold text-apagado">
          ({quemFez(versao)}, {formatarDataHora(versao.criadoEm)})
        </span>
      </h3>
      <div className="flex flex-col gap-2 text-sm text-texto">
        <Linhas linhas={versao.linhas} metas={metas} />
      </div>
    </section>
  );
}

/** A lista das versões, da mais nova à mais antiga, com a instrução de cada "gerar de novo". */
function ListaDasVersoes({ versoes }: Readonly<{ versoes: readonly VersaoDoHistorico[] }>) {
  return (
    <ol className="flex flex-col gap-1.5">
      {versoes.map((versao, i) => (
        <li key={versao.id} className="flex flex-col">
          <span className="font-semibold text-texto">
            Versão {versoes.length - i}: {quemFez(versao)}, {formatarDataHora(versao.criadoEm)}
            {i === 0 && ' (atual)'}
          </span>
          {versao.instrucao !== null && (
            <span className="text-texto-2">Instrução: {versao.instrucao}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** As versões carregadas: a comparação com o texto da IA, quando o atual é outro, e a lista. */
function Versoes({ evolucaoId, numero }: Readonly<Props>) {
  const consulta = useQuery(historicoOptions(evolucaoId, numero));
  const [comparando, setComparando] = useState(false);
  if (consulta.isPending) return <p className="mt-2 text-apagado">Carregando as versões…</p>;
  if (consulta.isError) {
    return (
      <p role="alert" className="mt-2 font-bold text-bloq-text">
        {consulta.error.message}
      </p>
    );
  }
  const [atual] = consulta.data;
  const daIA = consulta.data.find((v) => v.autor === 'ia');
  const podeComparar = atual !== undefined && daIA !== undefined && daIA.id !== atual.id;
  return (
    <div className="mt-2 flex flex-col gap-3">
      {podeComparar && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          aria-pressed={comparando}
          onClick={() => {
            setComparando((antes) => !antes);
          }}
        >
          <Columns2 aria-hidden="true" />
          Comparar com o texto da IA
        </Button>
      )}
      {podeComparar && comparando && (
        <div className="grid gap-3 md:grid-cols-2">
          <Coluna titulo="Texto da IA" versao={daIA} metas={numero !== 2} />
          <Coluna titulo="Texto atual" versao={atual} metas={numero !== 2} />
        </div>
      )}
      <ListaDasVersoes versoes={consulta.data} />
    </div>
  );
}

/**
 * O histórico da parte (E07): nenhuma versão se perde. Fechado por padrão, e só busca as versões
 * quando aberto. Contas médicas não vê (o banco devolve a lista vazia).
 */
export function HistoricoDaParte(props: Readonly<Props>) {
  const [aberto, setAberto] = useState(false);
  return (
    <details
      className="rounded-lg border border-borda px-3 py-2 text-caption"
      onToggle={(evento) => {
        setAberto(evento.currentTarget.open);
      }}
    >
      <summary className="flex cursor-pointer items-center gap-1.5 font-bold text-azul foco-anel">
        <History aria-hidden="true" className="size-3.5" />
        Versões desta parte
      </summary>
      {aberto && <Versoes {...props} />}
    </details>
  );
}
