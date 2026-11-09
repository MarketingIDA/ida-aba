import { SearchX, X } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import { LinhaDaEvolucao } from '@/features/evolucoes/components/LinhaDaEvolucao';
import { SITUACAO, type Situacao } from '@/features/evolucoes/logica';

interface Props {
  linhas: readonly LinhaDoMes[];
  visaoGeral: boolean;
  /** Nome curto de cada coordenador, pelo id (só na visão geral). */
  coordenadores: ReadonlyMap<number, string>;
  nomeDoMes: string;
  situacao: Situacao | null;
  temBusca: boolean;
  aoTirarFiltros: () => void;
}

function ListaVazia({
  situacao,
  temBusca,
  aoTirarFiltros,
}: Readonly<Pick<Props, 'situacao' | 'temBusca' | 'aoTirarFiltros'>>) {
  const titulo =
    situacao === null
      ? 'Nenhum assistido encontrado'
      : `Nenhuma evolução em "${SITUACAO[situacao].plural.toLowerCase()}"`;
  let descricao = 'Nenhum assistido neste recorte de unidade e coordenador.';
  if (temBusca) descricao = 'Nenhum nome ou código tem esse texto.';
  else if (situacao !== null) descricao = 'Quando houver, elas aparecem aqui.';
  return (
    <EmptyState
      icone={SearchX}
      titulo={titulo}
      descricao={descricao}
      acao={
        <Button variant="secondary" onClick={aoTirarFiltros}>
          <X aria-hidden="true" />
          Tirar os filtros
        </Button>
      }
    />
  );
}

/** A lista do recorte, já filtrada e ordenada; vazia, oferece tirar os filtros. */
export function ListaDeEvolucoes({ linhas, coordenadores, ...props }: Readonly<Props>) {
  if (linhas.length === 0) return <ListaVazia {...props} />;
  return (
    <ul
      aria-label={`Evoluções de ${props.nomeDoMes}`}
      className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
    >
      {linhas.map((linha) => (
        <LinhaDaEvolucao
          key={linha.assistidoId}
          linha={linha}
          visaoGeral={props.visaoGeral}
          coordenador={coordenadores.get(linha.coordenadorId) ?? null}
          nomeDoMes={props.nomeDoMes}
        />
      ))}
    </ul>
  );
}
