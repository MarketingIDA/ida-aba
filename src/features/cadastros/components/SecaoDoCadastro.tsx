import { ClipboardList, type LucideIcon, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { Button } from '@/components/ui/button';
import { AbasDoCadastro } from '@/features/cadastros/components/AbasDoCadastro';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise o suporte.';

/** O que a seção lê da consulta: a de uma tabela (`useQuery`) ou a soma de várias. */
export interface ConsultaDaSecao {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: readonly unknown[] | undefined;
  refetch: () => unknown;
}

interface Props {
  titulo: string;
  descricao: string;
  /** O botão que abre o cadastro de um novo (ex.: "Nova unidade"). */
  botao: string;
  aoCriar: () => void;
  /** O que acabou de ser salvo, lido pelo leitor de tela. */
  aviso: string;
  consulta: ConsultaDaSecao;
  vazio: { icone: LucideIcon; titulo: string; descricao: string };
  lista: ReactNode;
  gaveta: ReactNode;
  /** O que fica acima da lista, mesmo com ela vazia (ex.: a sincronização com a Tita). */
  topo?: ReactNode;
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
  if (consulta.data !== undefined && consulta.data.length > 0) return <>{lista}</>;
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
  const { titulo, descricao, botao, aoCriar, aviso, gaveta, topo } = props;
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[72ch] flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.1em] text-info-text uppercase">
            <ClipboardList aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Cadastros
          </p>
          <h1>{titulo}</h1>
          <p className="text-apagado">{descricao}</p>
        </div>
        <Button size="lg" onClick={aoCriar}>
          <Plus aria-hidden="true" />
          {botao}
        </Button>
      </header>
      <AbasDoCadastro />
      <p role="status" className="text-sm font-bold text-ok-text">
        {aviso}
      </p>
      {topo}
      <Conteudo {...props} />
      {gaveta}
    </section>
  );
}
