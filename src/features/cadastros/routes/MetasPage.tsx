import { useQuery } from '@tanstack/react-query';
import { Target, Users } from 'lucide-react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { Assistido } from '@/features/cadastros/api/assistidos.api';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { contarMetas, todasAsMetasOptions } from '@/features/cadastros/metas';
import { assistidosOptions } from '@/features/cadastros/queries';
import { ehErroApp } from '@/lib/erroApp';
import { iniciais } from '@/utils/iniciais';
import { plural } from '@/utils/textos';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

function Linha({ assistido, metas }: Readonly<{ assistido: Assistido; metas: readonly Meta[] }>) {
  const contagem = contarMetas(metas);
  const resumo =
    metas.length === 0
      ? 'Ainda sem metas cadastradas'
      : `${plural(contagem.desenvolvimento, 'meta', 'metas')} em desenvolvimento · ${String(contagem.alcancada)} alcançadas`;
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 sm:px-5">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-info-soft text-caption font-extrabold text-azul-escuro"
      >
        {iniciais(assistido.nome)}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="truncate text-[0.90625rem] leading-tight text-marinho">
          {/* A linha toda é o alvo do toque: o ::after do link cobre o `li`. */}
          <Link
            to={`/metas/${String(assistido.id)}`}
            className="rounded-sm foco-anel after:absolute after:inset-0 after:content-['']"
          >
            {assistido.nome}
          </Link>
        </b>
        <span className="text-caption font-semibold text-apagado">{resumo}</span>
      </span>
    </li>
  );
}

const CABECALHO = (
  <div className="flex max-w-[72ch] flex-col gap-1.5">
    <p className="flex items-center gap-2 rotulo text-azul">
      <Target aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      Plano terapêutico
    </p>
    <h1>Metas dos assistidos</h1>
    <p className="text-sm font-semibold text-texto-2">
      As metas em desenvolvimento são o ponto de partida das metas para o mês atual de cada
      evolução.
    </p>
  </div>
);

/** Os assistidos ativos numa carteira (o rascunho da Tita ainda não tem), em ordem alfabética. */
const emOrdem = (assistidos: readonly Assistido[]) =>
  assistidos
    .filter((assistido) => assistido.ativo && assistido.carteiraId !== null)
    .toSorted((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

/**
 * Metas dos assistidos (E23): cada assistido ativo com o resumo do plano terapêutico. O
 * coordenador vê a carteira dele; a coordenação geral, todos.
 */
export function MetasPage() {
  const assistidos = useQuery(assistidosOptions());
  const metas = useQuery(todasAsMetasOptions());
  const ativos = emOrdem(assistidos.data ?? []);
  const erro = assistidos.error ?? metas.error;

  return (
    <section className="flex flex-col gap-5">
      {CABECALHO}
      {(assistidos.isPending || metas.isPending) && (
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
          aoTentarDeNovo={() => {
            void assistidos.refetch();
            void metas.refetch();
          }}
        />
      )}
      {assistidos.isSuccess && metas.isSuccess && ativos.length === 0 && (
        <EmptyState
          icone={Users}
          titulo="Nenhum assistido na carteira"
          descricao="As metas são cadastradas por assistido. A coordenação geral inclui os assistidos na carteira."
        />
      )}
      {assistidos.isSuccess && metas.isSuccess && ativos.length > 0 && (
        <ul
          aria-label="Assistidos"
          className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
        >
          {ativos.map((assistido) => (
            <Linha
              key={assistido.id}
              assistido={assistido}
              metas={metas.data.filter((meta) => meta.assistidoId === assistido.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
