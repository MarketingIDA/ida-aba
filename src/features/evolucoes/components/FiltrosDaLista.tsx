import { Search, X } from 'lucide-react';
import { useId } from 'react';

import { Seletor } from '@/components/Seletor';
import { Input } from '@/components/ui/input';
import { SITUACAO, type Situacao } from '@/features/evolucoes/logica';
import type { Opcao } from '@/features/evolucoes/textos';

export interface Recorte {
  unidades: readonly Opcao[];
  unidade: string;
  aoMudarUnidade: (valor: string) => void;
  coordenadores: readonly Opcao[];
  coordenador: string;
  aoMudarCoordenador: (valor: string) => void;
}

interface Props {
  busca: string;
  aoBuscar: (texto: string) => void;
  situacao: Situacao | null;
  aoTirarSituacao: () => void;
  /** Só a coordenação geral filtra por unidade e coordenador. */
  recorte?: Recorte;
}

function Busca({ busca, aoBuscar }: Readonly<Pick<Props, 'busca' | 'aoBuscar'>>) {
  const id = useId();
  return (
    <div className="relative min-w-[200px] flex-1 sm:max-w-[360px]">
      <label htmlFor={id} className="sr-only">
        Buscar assistido ou código
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado"
      />
      <Input
        id={id}
        type="search"
        value={busca}
        placeholder="Buscar assistido ou código"
        onChange={(evento) => {
          aoBuscar(evento.target.value);
        }}
        className="pl-9"
      />
    </div>
  );
}

function Escolha({
  rotulo,
  todos,
  opcoes,
  valor,
  aoMudar,
}: Readonly<{
  rotulo: string;
  todos: string;
  opcoes: readonly Opcao[];
  valor: string;
  aoMudar: (valor: string) => void;
}>) {
  return (
    <Seletor
      aria-label={rotulo}
      value={valor}
      onChange={(evento) => {
        aoMudar(evento.target.value);
      }}
      className="w-auto max-w-full"
    >
      <option value="">{todos}</option>
      {opcoes.map((opcao) => (
        <option key={opcao.valor} value={opcao.valor}>
          {opcao.rotulo}
        </option>
      ))}
    </Seletor>
  );
}

/** Busca por nome ou código, recorte da coordenação geral e o chip do filtro de situação. */
export function FiltrosDaLista({ situacao, aoTirarSituacao, recorte, ...busca }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Busca {...busca} />
      {recorte !== undefined && (
        <>
          <Escolha
            rotulo="Unidade"
            todos="Todas as unidades"
            opcoes={recorte.unidades}
            valor={recorte.unidade}
            aoMudar={recorte.aoMudarUnidade}
          />
          <Escolha
            rotulo="Coordenador"
            todos="Todos os coordenadores"
            opcoes={recorte.coordenadores}
            valor={recorte.coordenador}
            aoMudar={recorte.aoMudarCoordenador}
          />
        </>
      )}
      {situacao !== null && (
        <button
          type="button"
          onClick={aoTirarSituacao}
          aria-label={`Tirar o filtro ${SITUACAO[situacao].plural}`}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-info-soft pr-2 pl-3 text-caption font-extrabold text-info-text foco-anel"
        >
          {SITUACAO[situacao].plural}
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  );
}
