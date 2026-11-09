import type { Coordenador, LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import { BarraDoPrazo } from '@/features/evolucoes/components/BarraDoPrazo';
import { FiltrosDaLista, type Recorte } from '@/features/evolucoes/components/FiltrosDaLista';
import { ListaDeEvolucoes } from '@/features/evolucoes/components/ListaDeEvolucoes';
import { ResumoDoMes } from '@/features/evolucoes/components/ResumoDoMes';
import { contarPorSituacao, filtrarLista, recortar } from '@/features/evolucoes/logica';
import type { FiltrosDaUrl } from '@/features/evolucoes/routes/useFiltrosDaUrl';
import { nomeCurto, opcoesDeCoordenador, opcoesDeUnidade } from '@/features/evolucoes/textos';
import { diasAtePrazo, formatarData, nomeDoMes, prazoDoArquivo } from '@dominio/mes.ts';

interface Props {
  linhas: readonly LinhaDoMes[];
  filtros: FiltrosDaUrl;
  visaoGeral: boolean;
  coordenadores: readonly Coordenador[];
  mesAberto: string;
  hoje: string;
}

const TIRAR_TUDO = { situacao: '', q: '', unidade: '', coordenador: '' };

/** Filtros de unidade e coordenador da coordenação geral; trocar a unidade solta o coordenador. */
function recorteDaVisaoGeral(
  linhas: readonly LinhaDoMes[],
  coordenadores: readonly Coordenador[],
  filtros: FiltrosDaUrl,
): Recorte {
  return {
    unidades: opcoesDeUnidade(linhas),
    unidade: filtros.unidade ?? '',
    aoMudarUnidade: (unidade) => {
      filtros.mudar({ unidade, coordenador: '' });
    },
    coordenadores: opcoesDeCoordenador(linhas, coordenadores, filtros.unidade),
    coordenador: filtros.coordenadorId === null ? '' : String(filtros.coordenadorId),
    aoMudarCoordenador: (coordenador) => {
      filtros.mudar({ coordenador });
    },
  };
}

/** O prazo só aparece no mês aberto: nos anteriores o arquivo já foi. */
function prazoDoMes(
  contagem: ReturnType<typeof contarPorSituacao>,
  mes: Props['mesAberto'],
  props: Pick<Props, 'mesAberto' | 'hoje'>,
) {
  if (mes !== props.mesAberto) return null;
  return (
    <BarraDoPrazo
      faltam={contagem.sem + contagem.em_conferencia}
      prazo={formatarData(prazoDoArquivo(mes), true)}
      dias={diasAtePrazo(props.hoje, mes)}
    />
  );
}

/** Cards, filtros, lista e prazo de um mês que já carregou e tem assistidos. */
export function ConteudoDoMes({
  linhas,
  filtros,
  visaoGeral,
  coordenadores,
  ...mes
}: Readonly<Props>) {
  const base = recortar(linhas, filtros);
  const contagem = contarPorSituacao(base);
  const recortado = filtros.unidade !== null || filtros.coordenadorId !== null;

  return (
    <>
      <ResumoDoMes
        total={base.length}
        rotuloDoTotal={visaoGeral ? 'Assistidos' : 'Carteira'}
        legendaDoTotal={recortado ? 'no recorte' : 'assistidos'}
        contagem={contagem}
        escolhida={filtros.situacao}
        aoEscolher={(situacao) => {
          filtros.mudar({ situacao: situacao ?? '' });
        }}
      />
      <FiltrosDaLista
        busca={filtros.busca}
        aoBuscar={(q) => {
          filtros.mudar({ q }, true);
        }}
        situacao={filtros.situacao}
        aoTirarSituacao={() => {
          filtros.mudar({ situacao: '' });
        }}
        {...(visaoGeral && { recorte: recorteDaVisaoGeral(linhas, coordenadores, filtros) })}
      />
      <ListaDeEvolucoes
        linhas={filtrarLista(base, filtros.situacao, filtros.busca)}
        visaoGeral={visaoGeral}
        coordenadores={new Map(coordenadores.map((c) => [c.id, nomeCurto(c.nome)]))}
        nomeDoMes={nomeDoMes(filtros.mes)}
        situacao={filtros.situacao}
        temBusca={filtros.busca.trim() !== ''}
        aoTirarFiltros={() => {
          filtros.mudar(TIRAR_TUDO);
        }}
      />
      {prazoDoMes(contagem, filtros.mes, mes)}
    </>
  );
}
