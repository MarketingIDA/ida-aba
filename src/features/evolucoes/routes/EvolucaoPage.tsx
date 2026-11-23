import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import { BaixarEvolucao } from '@/features/evolucoes/components/BaixarEvolucao';
import { BarraDaEvolucao } from '@/features/evolucoes/components/BarraDaEvolucao';
import { CabecalhoDaEvolucao } from '@/features/evolucoes/components/CabecalhoDaEvolucao';
import { DevolucoesDaEvolucao } from '@/features/evolucoes/components/DevolucoesDaEvolucao';
import { DevolverEvolucao } from '@/features/evolucoes/components/DevolverEvolucao';
import { EtapasDaEvolucao } from '@/features/evolucoes/components/EtapasDaEvolucao';
import { EscritaAMao } from '@/features/evolucoes/components/EscritaAMao';
import { ImportacaoDoTita } from '@/features/evolucoes/components/ImportacaoDoTita';
import { OutrosDocumentos } from '@/features/evolucoes/components/OutrosDocumentos';
import { GradeDaEvolucao } from '@/features/evolucoes/components/painel/PainelDaEvolucao';
import { SituacaoDaEvolucao } from '@/features/evolucoes/components/SituacaoDaEvolucao';
import { textoAnteriorOptions } from '@/features/evolucoes/api/anterior.api';
import { lacunasOptions } from '@/features/evolucoes/api/lacunas.api';
import {
  metasComProgramaOptions,
  metasJaAlcancadasOptions,
} from '@/features/evolucoes/api/metasDoCadastro.api';
import { type ContextoDaConferencia, prontaParaConcluir } from '@/features/evolucoes/conferencia';
import { evolucaoOptions, importacaoOptions } from '@/features/evolucoes/queries';
import { resumoDaConferencia } from '@/features/evolucoes/resumo';
import { PartesDaEvolucao } from '@/features/evolucoes/routes/PartesDaEvolucao';
import { useEdicaoDaEvolucao } from '@/features/evolucoes/routes/useEdicaoDaEvolucao';
import { useOutrosDocumentos } from '@/features/evolucoes/routes/useOutrosDocumentos';
import { conferirLeitura } from '@/features/evolucoes/tita/leitura';
import { ehErroApp } from '@/lib/erroApp';
import { frequenciaDoPeriodo } from '@dominio/frequencia.ts';

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

/**
 * O que a conferência lê fora da evolução: as metas já alcançadas (E12), as lacunas (E10), o texto
 * do mês anterior (P7), a frequência do período (E04) e o programa de cada meta (E12).
 */
/** Os alertas da importação atual que ainda esperam a ciência do coordenador (E19, P16). */
function alertasSemCiencia(importacao: Importacao | null, evolucao: Evolucao): number {
  if (importacao?.ciencia !== null) return 0;
  return conferirLeitura(importacao, evolucao.assistido, evolucao.mesRef).alertas.length;
}

function useContexto(evolucao: Evolucao): ContextoDaConferencia {
  const jaAlcancadas = useJaAlcancadas(evolucao.assistidoId);
  const lacunas = useQuery(lacunasOptions(evolucao.id));
  const anterior = useQuery({
    ...textoAnteriorOptions(evolucao.assistidoId ?? 0, evolucao.mesRef),
    enabled: evolucao.assistidoId !== null,
  });
  // A mesma consulta da importação do Tita: não busca de novo.
  const importacao = useQuery(importacaoOptions(evolucao.id));
  const metasComPrograma = useQuery({
    ...metasComProgramaOptions(evolucao.assistidoId ?? 0),
    enabled: evolucao.assistidoId !== null,
  });
  const { inicio, fim } = evolucao.periodo;
  const noPeriodo = (importacao.data?.analises ?? []).filter(
    (a) => a.data >= inicio && a.data <= fim,
  );
  return {
    jaAlcancadas,
    lacunas: lacunas.data ?? [],
    anterior: anterior.data ?? null,
    frequencia: frequenciaDoPeriodo(noPeriodo),
    metasComPrograma: metasComPrograma.data ?? [],
    alertasSemCiencia: alertasSemCiencia(importacao.data ?? null, evolucao),
  };
}

function ConteudoDaEvolucao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const edicao = useEdicaoDaEvolucao(evolucao);
  const documentos = useOutrosDocumentos(evolucao);
  const contexto = useContexto(evolucao);
  const importacao = useQuery(importacaoOptions(evolucao.id)).data ?? null;
  const resumo = resumoDaConferencia(evolucao, contexto);
  const ocupado = edicao.ocupado || edicao.editando !== null;
  return (
    <>
      <CabecalhoDaEvolucao
        evolucao={evolucao}
        importacao={importacao}
        documentos={documentos.documentos.length}
      >
        <EtapasDaEvolucao evolucao={evolucao} resumo={resumo} />
      </CabecalhoDaEvolucao>
      <SituacaoDaEvolucao
        evolucao={evolucao}
        resumo={resumo}
        ocupado={ocupado}
        aoConcluir={() => {
          edicao.mudarSituacao('concluida');
        }}
      />
      {evolucao.podeDevolver && <DevolverEvolucao evolucaoId={evolucao.id} />}
      <BaixarEvolucao evolucao={evolucao} />
      <DevolucoesDaEvolucao
        evolucao={evolucao}
        ocupado={edicao.ocupado}
        aoResolver={edicao.resolverDevolucao}
      />
      <ImportacaoDoTita evolucao={evolucao} bloqueioDoRascunho={documentos.bloqueio} />
      <EscritaAMao evolucao={evolucao} ocupado={ocupado} />
      <OutrosDocumentos evolucao={evolucao} estado={documentos} />
      <GradeDaEvolucao evolucao={evolucao} contexto={contexto} importacao={importacao}>
        <PartesDaEvolucao evolucao={evolucao} edicao={edicao} contexto={contexto} />
      </GradeDaEvolucao>
      <BarraDaEvolucao
        evolucao={evolucao}
        ocupado={ocupado}
        erro={edicao.erro}
        resumo={resumo}
        pronta={prontaParaConcluir(evolucao, contexto)}
        alertasDoTita={contexto.alertasSemCiencia ?? 0}
        aoMudar={edicao.mudarSituacao}
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
