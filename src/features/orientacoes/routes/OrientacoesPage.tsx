import { useQuery } from '@tanstack/react-query';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { CartoesDeContagem } from '@/components/CartoesDeContagem';
import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import {
  type Dica,
  type Orientacao,
  SITUACOES_DA_DICA,
  type SituacaoDaDica,
} from '@/features/orientacoes/api/orientacoes.api';
import {
  DicaDaCuradoria,
  SITUACAO_DA_DICA,
} from '@/features/orientacoes/components/DicaDaCuradoria';
import { OrientacoesEmUso } from '@/features/orientacoes/components/OrientacoesEmUso';
import { dicasOptions, orientacoesOptions, useCuradoria } from '@/features/orientacoes/queries';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise o suporte.';

const mensagem = (erro: unknown) => (ehErroApp(erro) ? erro.message : SEM_FORMATO);

const CABECALHO = (
  <div className="flex max-w-[72ch] flex-col gap-1.5">
    <p className="flex items-center gap-2 rotulo text-azul">
      <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      Configurações
    </p>
    <h1>Orientações da IA</h1>
    <p className="text-sm font-semibold text-texto-2">
      Os coordenadores deixam dicas nos blocos que a IA escreve. A dica aprovada aqui vira uma
      orientação, que a IA lê antes de gerar cada rascunho.
    </p>
  </div>
);

interface PropsDaCuradoria {
  dicas: readonly Dica[];
  orientacoes: readonly Orientacao[];
}

/** Os cards por situação (cada um abre a lista do que conta), as dicas e as orientações. */
function Curadoria({ dicas, orientacoes }: Readonly<PropsDaCuradoria>) {
  const [filtro, setFiltro] = useState<SituacaoDaDica | null>('pendente');
  const curadoria = useCuradoria();
  const lista = dicas.filter((d) => filtro === null || d.situacao === filtro);
  const erro = curadoria.aprovar.error ?? curadoria.descartar.error ?? curadoria.mudar.error;
  return (
    <>
      <CartoesDeContagem<SituacaoDaDica>
        rotulo="Situação das dicas"
        escolhido={filtro}
        aoEscolher={setFiltro}
        cartoes={SITUACOES_DA_DICA.map((valor) => ({
          valor,
          rotulo: SITUACAO_DA_DICA[valor].plural,
          total: dicas.filter((d) => d.situacao === valor).length,
          tom: SITUACAO_DA_DICA[valor].tom,
        }))}
      />
      {erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {mensagem(erro)}
        </p>
      )}
      {lista.length === 0 ? (
        <EmptyState
          icone={Lightbulb}
          titulo={filtro === 'pendente' ? 'Nenhuma dica à espera' : 'Nenhuma dica aqui'}
          descricao="As dicas chegam quando um coordenador usa “Dica para a IA” num bloco do rascunho."
        />
      ) : (
        <ul
          aria-label="Dicas para a IA"
          className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
        >
          {lista.map((dica) => (
            <DicaDaCuradoria key={dica.id} dica={dica} curadoria={curadoria} />
          ))}
        </ul>
      )}
      <OrientacoesEmUso orientacoes={orientacoes} curadoria={curadoria} />
    </>
  );
}

/** A curadoria das dicas para a IA e as orientações em uso (E22), da coordenação geral. */
export function OrientacoesPage() {
  const dicas = useQuery(dicasOptions());
  const orientacoes = useQuery(orientacoesOptions());
  const erro = dicas.error ?? orientacoes.error;
  return (
    <section className="flex flex-col gap-5">
      {CABECALHO}
      {(dicas.isPending || orientacoes.isPending) && (
        <div
          role="status"
          aria-label="Carregando as dicas"
          className="h-64 animate-pulse rounded-xl bg-neutro-suave"
        />
      )}
      {erro !== null && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar as dicas"
          mensagem={mensagem(erro)}
          aoTentarDeNovo={() => {
            void dicas.refetch();
            void orientacoes.refetch();
          }}
        />
      )}
      {dicas.isSuccess && orientacoes.isSuccess && (
        <Curadoria dicas={dicas.data} orientacoes={orientacoes.data} />
      )}
    </section>
  );
}
