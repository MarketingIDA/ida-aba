import type { UseQueryResult } from '@tanstack/react-query';
import { ClipboardList, type LucideIcon, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { Button } from '@/components/ui/button';
import { AbasDoCadastro } from '@/features/cadastros/components/AbasDoCadastro';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise o suporte.';

interface Props {
  titulo: string;
  descricao: string;
  /** O botão que abre o cadastro de um novo (ex.: "Nova unidade"). */
  botao: string;
  aoCriar: () => void;
  /** O que acabou de ser salvo, lido pelo leitor de tela. */
  aviso: string;
  consulta: UseQueryResult<readonly unknown[]>;
  vazio: { icone: LucideIcon; titulo: string; descricao: string };
  lista: ReactNode;
  gaveta: ReactNode;
}

function Carregando() {
  return (
    <div role="status" aria-label="Carregando o cadastro" className="flex flex-col gap-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-14 animate-pulse rounded-xl bg-neutro-suave" />
      ))}
    </div>
  );
}

function Conteudo({ consulta, titulo, vazio, lista, botao, aoCriar }: Readonly<Props>) {
  if (consulta.isPending) return <Carregando />;
  if (consulta.isError) {
    return (
      <FalhaAoCarregar
        titulo={`Não foi possível carregar ${titulo.toLowerCase()}`}
        mensagem={ehErroApp(consulta.error) ? consulta.error.message : SEM_FORMATO}
        aoTentarDeNovo={() => void consulta.refetch()}
      />
    );
  }
  if (consulta.data.length > 0) return <>{lista}</>;
  return (
    <EmptyState
      {...vazio}
      acao={
        <Button variant="secondary" onClick={aoCriar}>
          <Plus aria-hidden="true" />
          {botao}
        </Button>
      }
    />
  );
}

/** Uma parte do cadastro: título com a ação, as abas, a lista (ou o vazio) e a gaveta. */
export function SecaoDoCadastro(props: Readonly<Props>) {
  const { titulo, descricao, botao, aoCriar, aviso, gaveta } = props;
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[72ch] flex-col gap-1.5">
          <p className="flex items-center gap-2 rotulo text-azul">
            <ClipboardList aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Cadastros
          </p>
          <h1>{titulo}</h1>
          <p className="text-sm font-semibold text-texto-2">{descricao}</p>
        </div>
        <Button onClick={aoCriar}>
          <Plus aria-hidden="true" />
          {botao}
        </Button>
      </header>
      <AbasDoCadastro />
      <p role="status" className="text-sm font-bold text-ok-text">
        {aviso}
      </p>
      <Conteudo {...props} />
      {gaveta}
    </section>
  );
}
