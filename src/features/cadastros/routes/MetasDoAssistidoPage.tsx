import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { CartoesDeContagem } from '@/components/CartoesDeContagem';
import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { Situacao } from '@/components/Situacao';
import { Button } from '@/components/ui/button';
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
import { assistidosOptions } from '@/features/cadastros/queries';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

function LinhaDaMeta({ meta, aoAlterar }: Readonly<{ meta: Meta; aoAlterar?: () => void }>) {
  const { rotulo, tom } = SITUACAO_DA_META[meta.situacao];
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-sm text-marinho">{meta.texto}</b>
        <span className="text-caption font-semibold text-apagado">
          {meta.programa ?? 'Sem programa'} · critério: {meta.criterio}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <Situacao rotulo={rotulo} tom={tom} />
        {aoAlterar !== undefined && (
          <Button variant="secondary" size="sm" onClick={aoAlterar}>
            <Pencil aria-hidden="true" />
            Alterar
          </Button>
        )}
      </span>
    </li>
  );
}

/** As metas do filtro, ou o convite a cadastrar a primeira. */
function ListaDeMetas({
  metas,
  semNenhuma,
  aoAlterar,
}: Readonly<{ metas: readonly Meta[]; semNenhuma: boolean; aoAlterar?: (meta: Meta) => void }>) {
  if (metas.length === 0) {
    return (
      <EmptyState
        icone={Target}
        titulo={semNenhuma ? 'Nenhuma meta cadastrada' : 'Nenhuma meta nesta situação'}
        descricao="As metas em desenvolvimento entram como ponto de partida das metas para o mês atual da evolução."
      />
    );
  }
  return (
    <ul
      aria-label="Metas"
      className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
    >
      {metas.map((meta) => (
        <LinhaDaMeta
          key={meta.id}
          meta={meta}
          {...(aoAlterar !== undefined && {
            aoAlterar: () => {
              aoAlterar(meta);
            },
          })}
        />
      ))}
    </ul>
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
        }))}
      />
      {podeAlterar && (
        <Button size="lg" className="self-start" onClick={gaveta.abrirNovo}>
          <Plus aria-hidden="true" />
          Nova meta
        </Button>
      )}
      <ListaDeMetas
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
  const valido = Number.isInteger(assistidoId) && assistidoId > 0;
  const podeAlterar = useUsuario()?.papel === 'coordenador';
  const assistidos = useQuery({ ...assistidosOptions(), enabled: valido });
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
      <div>
        <p className="mb-1.5 rotulo text-azul">Plano terapêutico</p>
        <h1>{assistido?.nome ?? 'Metas do assistido'}</h1>
      </div>
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
