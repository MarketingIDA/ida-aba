import { useQuery } from '@tanstack/react-query';
import { Search, Target, Users } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { Assistido } from '@/features/cadastros/api/assistidos.api';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { LinhaDasMetas, useLocalDasCarteiras } from '@/features/cadastros/components/LinhaDasMetas';
import { todasAsMetasOptions } from '@/features/cadastros/metas';
import { ehErroApp } from '@/lib/erroApp';
import { useAssistidosDaCarteira } from '@/features/cadastros/useAssistidosDaCarteira';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

const CABECALHO = (
  <div className="flex max-w-[72ch] flex-col gap-1.5">
    <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.1em] text-info-text uppercase">
      <Target aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      Cadastros
    </p>
    <h1>Metas dos assistidos</h1>
    <p className="text-apagado">
      O plano terapêutico de cada assistido: metas em desenvolvimento, alcançadas, em manutenção e
      suspensas.
    </p>
  </div>
);

/** Os assistidos ativos numa carteira (o rascunho da Tita ainda não tem), em ordem alfabética. */
const sem = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
const emOrdem = (assistidos: readonly Assistido[], busca: string) =>
  assistidos
    .filter((assistido) => assistido.ativo && assistido.carteiraId !== null)
    .filter((assistido) => sem(assistido.nome).includes(sem(busca.trim())))
    .toSorted((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

function Busca({ valor, aoMudar }: Readonly<{ valor: string; aoMudar: (v: string) => void }>) {
  return (
    <label className="relative w-full max-w-[360px]">
      <Search
        aria-hidden="true"
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado"
      />
      <span className="sr-only">Buscar assistido</span>
      <input
        type="search"
        placeholder="Buscar assistido"
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
        }}
        className="h-10 w-full rounded-md border-[1.5px] border-borda-forte bg-white pr-3.5 pl-[38px] font-semibold foco-anel"
      />
    </label>
  );
}

function Lista({
  ativos,
  metas,
  buscando,
}: Readonly<{ ativos: readonly Assistido[]; metas: readonly Meta[]; buscando: boolean }>) {
  const local = useLocalDasCarteiras();
  if (ativos.length === 0 && buscando) {
    return (
      <p role="status" className="text-sm font-semibold text-texto-2">
        Nenhum assistido com esse nome.
      </p>
    );
  }
  if (ativos.length === 0) {
    return (
      <EmptyState
        icone={Users}
        titulo="Nenhum assistido na carteira"
        descricao="As metas são cadastradas por assistido. A coordenação geral inclui os assistidos na carteira."
      />
    );
  }
  return (
    <ul
      aria-label="Assistidos"
      className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-md"
    >
      {ativos.map((assistido) => (
        <LinhaDasMetas
          key={assistido.id}
          assistido={assistido}
          local={assistido.carteiraId === null ? undefined : local.get(assistido.carteiraId)}
          metas={metas.filter((meta) => meta.assistidoId === assistido.id)}
        />
      ))}
    </ul>
  );
}

/**
 * Metas dos assistidos (E23): cada assistido ativo com o resumo do plano terapêutico. O
 * coordenador vê a carteira dele; a coordenação geral, todos.
 */
export function MetasPage() {
  const assistidos = useAssistidosDaCarteira();
  const metas = useQuery(todasAsMetasOptions());
  const [busca, setBusca] = useState('');
  const ativos = emOrdem(assistidos.data ?? [], busca);
  const erro = assistidos.error ?? metas.error;

  return (
    <section className="flex flex-col gap-5">
      {CABECALHO}
      <Busca valor={busca} aoMudar={setBusca} />
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
      {assistidos.isSuccess && metas.isSuccess && (
        <Lista ativos={ativos} metas={metas.data} buscando={busca.trim() !== ''} />
      )}
    </section>
  );
}
