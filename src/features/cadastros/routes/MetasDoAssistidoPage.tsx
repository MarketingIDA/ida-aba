import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { CartoesDeContagem } from '@/components/CartoesDeContagem';
import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { BarraInferior } from '@/components/BarraInferior';
import { TituloDasMetas } from '@/features/cadastros/components/TituloDasMetas';
import { Button } from '@/components/ui/button';
import { ListaDeMetas } from '@/features/cadastros/components/ListaDeMetas';
import {
  type DadosDaMeta,
  type Meta,
  SITUACOES_DA_META,
  type SituacaoDaMeta,
} from '@/features/cadastros/api/metas.api';
import { FormularioDeMeta } from '@/features/cadastros/components/FormularioDeMeta';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import {
  contarMetas,
  metasDoAssistidoOptions,
  SITUACAO_DA_META,
  useSalvarMeta,
} from '@/features/cadastros/metas';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { useUsuario } from '@/hooks/useUsuario';
import { useRegistrarAbertura } from '@/lib/auditoria';
import { ehErroApp } from '@/lib/erroApp';
import { useAssistidosDaCarteira } from '@/features/cadastros/useAssistidosDaCarteira';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

/** A linha pequena de cada card, como no protótipo. */
const LEGENDA: Record<SituacaoDaMeta, string> = {
  desenvolvimento: 'entram nas metas do mês',
  alcancada: 'saem das metas do mês',
  manutencao: 'alcançadas, acompanhadas',
  suspensa: 'fora das metas do mês',
};

/** A barra do pé da tela, só para quem cadastra: a regra e "Nova meta". */
function BarraDasMetas({ aoIncluir }: Readonly<{ aoIncluir: () => void }>) {
  return (
    <BarraInferior
      regra={
        <>
          <Target aria-hidden="true" className="size-4 shrink-0" />
          As metas em desenvolvimento entram nas metas para o mês atual do rascunho.
        </>
      }
      acoes={
        <Button size="lg" onClick={aoIncluir}>
          <Plus aria-hidden="true" />
          Nova meta
        </Button>
      }
    />
  );
}

interface PropsDasMetas {
  assistidoId: number;
  metas: readonly Meta[];
  /** Só o coordenador da carteira cadastra e altera; a coordenação geral lê. */
  podeAlterar: boolean;
}

/** Os cards por situação (cada um abre a lista do que conta), a lista e a gaveta do formulário. */
function MetasDoAssistido({ assistidoId, metas, podeAlterar }: Readonly<PropsDasMetas>) {
  const [filtro, setFiltro] = useState<SituacaoDaMeta | null>(null);
  const salvar = useSalvarMeta(assistidoId);
  const gaveta = useGaveta<Meta>();
  const contagem = contarMetas(metas);
  const lista = metas.filter((meta) => filtro === null || meta.situacao === filtro);

  async function aoSalvar(dados: DadosDaMeta) {
    await salvar.mutateAsync({ dados, id: gaveta.item?.id });
    gaveta.fechar();
  }

  return (
    <>
      <CartoesDeContagem<SituacaoDaMeta>
        rotulo="Situação das metas"
        colunas={4}
        escolhido={filtro}
        aoEscolher={setFiltro}
        cartoes={SITUACOES_DA_META.map((valor) => ({
          valor,
          rotulo: SITUACAO_DA_META[valor].plural,
          total: contagem[valor],
          tom: SITUACAO_DA_META[valor].tom,
          legenda: LEGENDA[valor],
        }))}
      />
      {podeAlterar && <BarraDasMetas aoIncluir={gaveta.abrirNovo} />}
      <ListaDeMetas
        titulo={filtro === null ? 'Plano terapêutico' : SITUACAO_DA_META[filtro].plural}
        metas={lista}
        semNenhuma={metas.length === 0}
        {...(podeAlterar && { aoAlterar: gaveta.abrirEdicao })}
      />
      <GavetaDoCadastro
        aberta={gaveta.aberta}
        aoFechar={gaveta.fechar}
        titulo={gaveta.item === null ? 'Nova meta' : 'Alterar meta'}
        descricao="A meta do plano terapêutico do assistido, com o critério de alcance."
        chave={gaveta.item?.id ?? 'nova'}
      >
        <FormularioDeMeta meta={gaveta.item} aoSalvar={aoSalvar} aoCancelar={gaveta.fechar} />
      </GavetaDoCadastro>
    </>
  );
}

/** O cadastro de metas de um assistido (E23). */
export function MetasDoAssistidoPage() {
  const assistidoId = Number(useParams().assistidoId);
  useRegistrarAbertura('abriu_metas', String(assistidoId));
  const valido = Number.isInteger(assistidoId) && assistidoId > 0;
  const podeAlterar = useUsuario()?.papel === 'coordenador';
  const assistidos = useAssistidosDaCarteira({ enabled: valido });
  const metas = useQuery({ ...metasDoAssistidoOptions(assistidoId), enabled: valido });
  const assistido = assistidos.data?.find((a) => a.id === assistidoId);
  const erro = assistidos.error ?? metas.error;

  return (
    <section className="flex flex-col gap-5">
      <Link
        to="/metas"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-bold text-azul foco-anel hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Metas dos assistidos
      </Link>
      <TituloDasMetas assistidoId={assistidoId} nome={assistido?.nome} />
      {valido && (assistidos.isPending || metas.isPending) && (
        <div
          role="status"
          aria-label="Carregando as metas"
          className="h-64 animate-pulse rounded-xl bg-neutro-suave"
        />
      )}
      {erro !== null && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar as metas"
          mensagem={ehErroApp(erro) ? erro.message : SEM_FORMATO}
          aoTentarDeNovo={() => void metas.refetch()}
        />
      )}
      {(!valido || (assistidos.isSuccess && assistido === undefined)) && (
        <EmptyState
          icone={Target}
          titulo="Assistido não encontrado"
          descricao="O endereço pode estar incompleto, ou o assistido é de uma carteira que não é a sua."
        />
      )}
      {assistido !== undefined && metas.isSuccess && (
        <MetasDoAssistido assistidoId={assistidoId} metas={metas.data} podeAlterar={podeAlterar} />
      )}
    </section>
  );
}
