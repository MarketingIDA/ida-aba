import { useQuery } from '@tanstack/react-query';
import { ChartLine } from 'lucide-react';
import { useParams } from 'react-router';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { metasDoAssistidoOptions } from '@/features/cadastros/metas';
import type { DadosDoProgresso } from '@/features/progresso/api/progresso.api';
import { VoltarParaEvolucoes } from '@/features/progresso/components/AcoesDoProgresso';
import { SemNiveis } from '@/features/progresso/components/SemNiveis';
import { ProgressoDoAssistido } from '@/features/progresso/components/ProgressoDoAssistido';
import { progressoOptions } from '@/features/progresso/queries';
import { useUsuario } from '@/hooks/useUsuario';
import { useRegistrarAbertura } from '@/lib/auditoria';
import { ehErroApp } from '@/lib/erroApp';
import { useAssistidosDaCarteira } from '@/features/cadastros/useAssistidosDaCarteira';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

/** Sem evolução nenhuma, não há o que desenhar nem o que ler. */
const SEM_EVOLUCAO = (
  <EmptyState
    icone={ChartLine}
    titulo="Nenhuma evolução ainda"
    descricao="O gráfico nasce das evoluções: crie a evolução do mês e importe o PDF do Tita."
  />
);

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
  const podeLer = useUsuario()?.papel === 'coordenador';
  const ultima = dados.periodos[0];
  if (!dados.periodos.some((p) => p.lido)) {
    return (
      <>
        <VoltarParaEvolucoes />
        <h1>{nome}</h1>
        {ultima === undefined ? (
          SEM_EVOLUCAO
        ) : (
          <SemNiveis assistidoId={assistidoId} ultima={ultima} metas={metas} podeLer={podeLer} />
        )}
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
  const assistidos = useAssistidosDaCarteira({ enabled: valido });
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
  useRegistrarAbertura('abriu_progresso', String(assistidoId));
  const valido = Number.isInteger(assistidoId) && assistidoId > 0;
  const { assistidos, metas, dados, assistido, erro, carregando, tentarDeNovo } = useDadosDaPagina(
    assistidoId,
    valido,
  );
  const temConteudo = assistido !== undefined && dados.isSuccess && metas.isSuccess;
  return (
    <section className="flex flex-col gap-5">
      {/* Com o gráfico na tela, a volta divide a linha com "Baixar PDF" (ProgressoDoAssistido). */}
      {!temConteudo && <VoltarParaEvolucoes />}
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
      {temConteudo && (
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
