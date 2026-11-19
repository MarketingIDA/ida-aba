import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChartLine } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { buttonVariants } from '@/components/ui/button';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { metasDoAssistidoOptions } from '@/features/cadastros/metas';
import { assistidosOptions } from '@/features/cadastros/queries';
import type { DadosDoProgresso } from '@/features/progresso/api/progresso.api';
import { ProgressoDoAssistido } from '@/features/progresso/components/ProgressoDoAssistido';
import { progressoOptions } from '@/features/progresso/queries';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

const RELER =
  'A IA lê o nível de apoio logo depois da importação do PDF do Tita. Na evolução, "Ler os níveis" pede a leitura de novo.';

/** Sem evolução, ou sem nenhum mês com os níveis lidos: não há o que desenhar ainda. */
function SemNiveis({ dados }: Readonly<{ dados: DadosDoProgresso }>) {
  const ultima = dados.periodos[0];
  if (ultima === undefined) {
    return (
      <EmptyState
        icone={ChartLine}
        titulo="Nenhuma evolução ainda"
        descricao="O gráfico nasce das evoluções: crie a evolução do mês e importe o PDF do Tita."
      />
    );
  }
  return (
    <EmptyState
      icone={ChartLine}
      titulo="Os níveis de apoio ainda não foram lidos"
      descricao={RELER}
      acao={
        <Link
          to={`/evolucoes/${ultima.evolucaoId}`}
          className={buttonVariants({ variant: 'secondary' })}
        >
          Abrir a evolução mais recente
        </Link>
      }
    />
  );
}

function Conteudo({
  nome,
  assistidoId,
  metas,
  dados,
}: Readonly<{
  nome: string;
  assistidoId: number;
  metas: readonly Meta[];
  dados: DadosDoProgresso;
}>) {
  if (!dados.periodos.some((p) => p.lido)) {
    return (
      <>
        <h1>{nome}</h1>
        <SemNiveis dados={dados} />
      </>
    );
  }
  return (
    <ProgressoDoAssistido
      nome={nome}
      assistidoId={assistidoId}
      metas={metas}
      periodos={dados.periodos}
      pontos={dados.pontos}
    />
  );
}

function useDadosDaPagina(assistidoId: number, valido: boolean) {
  const assistidos = useQuery({ ...assistidosOptions(), enabled: valido });
  const metas = useQuery({ ...metasDoAssistidoOptions(assistidoId), enabled: valido });
  const dados = useQuery({ ...progressoOptions(assistidoId), enabled: valido });
  return {
    assistidos,
    metas,
    dados,
    assistido: assistidos.data?.find((a) => a.id === assistidoId),
    erro: assistidos.error ?? metas.error ?? dados.error,
    carregando: valido && (assistidos.isPending || metas.isPending || dados.isPending),
    tentarDeNovo: () => {
      void metas.refetch();
      void dados.refetch();
    },
  };
}

/** A evolução das metas em gráfico de um assistido (E27). */
export function ProgressoPage() {
  const assistidoId = Number(useParams().assistidoId);
  const valido = Number.isInteger(assistidoId) && assistidoId > 0;
  const { assistidos, metas, dados, assistido, erro, carregando, tentarDeNovo } = useDadosDaPagina(
    assistidoId,
    valido,
  );
  return (
    <section className="flex flex-col gap-5">
      <Link
        to="/evolucoes"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-bold text-azul foco-anel hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Evoluções
      </Link>
      {carregando && (
        <div
          role="status"
          aria-label="Carregando a evolução das metas"
          className="h-96 animate-pulse rounded-3xl bg-neutro-suave"
        />
      )}
      {erro !== null && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar a evolução das metas"
          mensagem={ehErroApp(erro) ? erro.message : SEM_FORMATO}
          aoTentarDeNovo={tentarDeNovo}
        />
      )}
      {(!valido || (assistidos.isSuccess && assistido === undefined)) && (
        <EmptyState
          icone={ChartLine}
          titulo="Assistido não encontrado"
          descricao="O endereço pode estar incompleto, ou o assistido é de uma carteira que não é a sua."
        />
      )}
      {assistido !== undefined && dados.isSuccess && metas.isSuccess && (
        <Conteudo
          nome={assistido.nome}
          assistidoId={assistidoId}
          metas={metas.data}
          dados={dados.data}
        />
      )}
    </section>
  );
}
