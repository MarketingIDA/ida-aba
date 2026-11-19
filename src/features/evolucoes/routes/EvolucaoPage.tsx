import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { BarraDaEvolucao } from '@/features/evolucoes/components/BarraDaEvolucao';
import { CabecalhoDaEvolucao } from '@/features/evolucoes/components/CabecalhoDaEvolucao';
import { DevolucoesDaEvolucao } from '@/features/evolucoes/components/DevolucoesDaEvolucao';
import { ImportacaoDoTita } from '@/features/evolucoes/components/ImportacaoDoTita';
import { OutrosDocumentos } from '@/features/evolucoes/components/OutrosDocumentos';
import { textoAnteriorOptions } from '@/features/evolucoes/api/anterior.api';
import { lacunasOptions } from '@/features/evolucoes/api/lacunas.api';
import { metasJaAlcancadasOptions } from '@/features/evolucoes/api/metasDoCadastro.api';
import type { ContextoDaConferencia } from '@/features/evolucoes/conferencia';
import { evolucaoOptions } from '@/features/evolucoes/queries';
import { PartesDaEvolucao } from '@/features/evolucoes/routes/PartesDaEvolucao';
import { useEdicaoDaEvolucao } from '@/features/evolucoes/routes/useEdicaoDaEvolucao';
import { useOutrosDocumentos } from '@/features/evolucoes/routes/useOutrosDocumentos';
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

/** As metas já alcançadas do cadastro: enquanto não chegam, a tela não bloqueia; o banco confere. */
function useJaAlcancadas(assistidoId: number | null): readonly string[] {
  const consulta = useQuery({
    ...metasJaAlcancadasOptions(assistidoId ?? 0),
    enabled: assistidoId !== null,
  });
  return consulta.data ?? [];
}

/** O que a conferência lê fora da evolução: as metas já alcançadas (E12) e as lacunas (E10). */
function useContexto(evolucao: Evolucao): ContextoDaConferencia {
  const jaAlcancadas = useJaAlcancadas(evolucao.assistidoId);
  const lacunas = useQuery(lacunasOptions(evolucao.id));
  const anterior = useQuery({
    ...textoAnteriorOptions(evolucao.assistidoId ?? 0, evolucao.mesRef),
    enabled: evolucao.assistidoId !== null,
  });
  return { jaAlcancadas, lacunas: lacunas.data ?? [], anterior: anterior.data ?? null };
}

function ConteudoDaEvolucao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const edicao = useEdicaoDaEvolucao(evolucao);
  const documentos = useOutrosDocumentos(evolucao);
  const contexto = useContexto(evolucao);
  return (
    <>
      <CabecalhoDaEvolucao evolucao={evolucao} />
      <DevolucoesDaEvolucao
        evolucao={evolucao}
        ocupado={edicao.ocupado}
        aoResolver={edicao.resolverDevolucao}
      />
      <ImportacaoDoTita evolucao={evolucao} bloqueioDoRascunho={documentos.bloqueio} />
      <OutrosDocumentos evolucao={evolucao} estado={documentos} />
      <PartesDaEvolucao evolucao={evolucao} edicao={edicao} contexto={contexto} />
      <BarraDaEvolucao
        evolucao={evolucao}
        ocupado={edicao.ocupado || edicao.editando !== null}
        erro={edicao.erro}
        contexto={contexto}
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

/** Uma evolução mensal: as 4 partes, a conferência de cada uma, a devolução e concluir ou reabrir. */
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
