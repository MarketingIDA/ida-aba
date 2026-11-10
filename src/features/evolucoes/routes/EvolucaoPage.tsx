import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { BarraDaEvolucao } from '@/features/evolucoes/components/BarraDaEvolucao';
import { CabecalhoDaEvolucao } from '@/features/evolucoes/components/CabecalhoDaEvolucao';
import { evolucaoOptions } from '@/features/evolucoes/queries';
import { PartesDaEvolucao } from '@/features/evolucoes/routes/PartesDaEvolucao';
import { useEdicaoDaEvolucao } from '@/features/evolucoes/routes/useEdicaoDaEvolucao';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

const NAO_ENCONTRADA = (
  <EmptyState
    icone={SearchX}
    titulo="Evolução não encontrada"
    descricao="O endereço pode estar incompleto, ou a evolução é de uma carteira que não é a sua. Volte à lista e abra a evolução por lá."
  />
);

function Carregando() {
  return (
    <div role="status" aria-label="Carregando a evolução" className="flex flex-col gap-4">
      <div className="h-24 animate-pulse rounded-xl bg-neutro-suave" />
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-48 animate-pulse rounded-xl bg-neutro-suave" />
      ))}
    </div>
  );
}

function ConteudoDaEvolucao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const edicao = useEdicaoDaEvolucao(evolucao);
  return (
    <>
      <CabecalhoDaEvolucao evolucao={evolucao} />
      <PartesDaEvolucao evolucao={evolucao} edicao={edicao} />
      <BarraDaEvolucao
        evolucao={evolucao}
        ocupado={edicao.ocupado || edicao.editando !== null}
        erro={edicao.erro}
        aoConcluir={() => {
          edicao.mudarSituacao('concluida');
        }}
        aoReabrir={() => {
          edicao.mudarSituacao('em_conferencia');
        }}
      />
    </>
  );
}

/** Uma evolução mensal: as 4 partes, a conferência de cada uma e concluir ou reabrir. */
export function EvolucaoPage() {
  const { id = '' } = useParams();
  const valido = z.guid().safeParse(id).success;
  const consulta = useQuery({ ...evolucaoOptions(id), enabled: valido });
  return (
    <section className="flex flex-col gap-5">
      <Link
        to="/evolucoes"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-bold text-azul foco-anel hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Evoluções mensais
      </Link>
      {!valido && NAO_ENCONTRADA}
      {valido && consulta.isPending && <Carregando />}
      {consulta.isError && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar a evolução"
          mensagem={ehErroApp(consulta.error) ? consulta.error.message : SEM_FORMATO}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      )}
      {consulta.isSuccess && consulta.data === null && NAO_ENCONTRADA}
      {consulta.isSuccess && consulta.data !== null && (
        <ConteudoDaEvolucao evolucao={consulta.data} />
      )}
    </section>
  );
}
