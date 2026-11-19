import { ChartLine, List, X } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { CartoesDeContagem } from '@/components/CartoesDeContagem';
import { Button } from '@/components/ui/button';
import type { Meta } from '@/features/cadastros/api/metas.api';
import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import {
  AcoesDoProgresso,
  AcoesDoRelatorio,
  VoltarParaEvolucoes,
} from '@/features/progresso/components/AcoesDoProgresso';
import { EscadaDaMeta } from '@/features/progresso/components/EscadaDaMeta';
import { HeroDoProgresso } from '@/features/progresso/components/HeroDoProgresso';
import { MapaDeSessoes } from '@/features/progresso/components/MapaDeSessoes';
import { TabelaDoProgresso } from '@/features/progresso/components/TabelaDoProgresso';
import { useMedianaDaCarteira } from '@/features/progresso/useMedianaDaCarteira';
import {
  calcularProgresso,
  ehFiltroDoProgresso,
  filtrarProgresso,
  type FiltroDoProgresso,
  type PontoDoProgresso,
  type Progresso,
} from '@dominio/progresso.ts';

const CARTOES: { valor: FiltroDoProgresso; rotulo: string; tom: 'alerta' | 'ok' | 'neutro' }[] = [
  { valor: 'desenvolvimento', rotulo: 'Em desenvolvimento', tom: 'neutro' },
  { valor: 'alcancada', rotulo: 'Alcançadas', tom: 'ok' },
  { valor: 'manutencao', rotulo: 'Em manutenção', tom: 'ok' },
  { valor: 'atencao', rotulo: 'Pedem atenção', tom: 'alerta' },
];

/** O filtro do card e a aba (gráficos ou tabela) moram na URL: dá para voltar e mandar o link. */
function useVisao() {
  const [params, setParams] = useSearchParams();
  const filtro = params.get('filtro');
  const mudar = (chave: string, valor: string | null) => {
    const novos = new URLSearchParams(params);
    if (valor === null) novos.delete(chave);
    else novos.set(chave, valor);
    setParams(novos);
  };
  return {
    filtro: ehFiltroDoProgresso(filtro) ? filtro : null,
    tabela: params.get('ver') === 'tabela',
    escolher: (valor: FiltroDoProgresso | null) => {
      mudar('filtro', valor);
    },
    verTabela: (sim: boolean) => {
      mudar('ver', sim ? 'tabela' : null);
    },
  };
}

type Visao = ReturnType<typeof useVisao>;

function Graficos({
  progresso,
  periodos,
  filtro,
}: Readonly<{
  progresso: Progresso;
  periodos: readonly PeriodoDaEvolucao[];
  filtro: FiltroDoProgresso | null;
}>) {
  const metas = filtrarProgresso(progresso.metas, filtro);
  return (
    <>
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
        {metas.map((x) => (
          <EscadaDaMeta key={x.meta.id} analise={x} progresso={progresso} periodos={periodos} />
        ))}
      </div>
      <section className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-5 shadow-sm">
        <div>
          <h2>Mapa de sessões</h2>
          <p className="text-sm text-texto-2">
            Quantas sessões por semana trabalharam cada meta. Semana em branco: o programa não
            apareceu nas análises lidas.
          </p>
        </div>
        <MapaDeSessoes metas={metas} semanas={progresso.semanas} />
      </section>
    </>
  );
}

/** Os botões da seção: tirar o filtro e trocar entre gráficos e tabela. */
function Botoes({ visao }: Readonly<{ visao: Visao }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visao.filtro !== null && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            visao.escolher(null);
          }}
        >
          <X aria-hidden="true" />
          Tirar o filtro
        </Button>
      )}
      <Button
        variant={visao.tabela ? 'ghost' : 'secondary'}
        size="sm"
        aria-pressed={!visao.tabela}
        onClick={() => {
          visao.verTabela(false);
        }}
      >
        <ChartLine aria-hidden="true" />
        Gráficos
      </Button>
      <Button
        variant={visao.tabela ? 'secondary' : 'ghost'}
        size="sm"
        aria-pressed={visao.tabela}
        onClick={() => {
          visao.verTabela(true);
        }}
      >
        <List aria-hidden="true" />
        Tabela
      </Button>
    </div>
  );
}

function Cabecalho({ visao }: Readonly<{ visao: Visao }>) {
  const titulo = CARTOES.find((c) => c.valor === visao.filtro)?.rotulo ?? 'A escada de cada meta';
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2>{titulo}</h2>
        <p className="max-w-[62ch] text-sm text-texto-2">
          Do degrau de mais apoio (ajuda física total) até independente. Cada ponto é um dia de
          sessão; a frase da análise aparece ao passar o mouse e na tabela.
        </p>
      </div>
      <Botoes visao={visao} />
    </div>
  );
}

interface Props {
  nome: string;
  assistidoId: number;
  metas: readonly Meta[];
  periodos: readonly PeriodoDaEvolucao[];
  pontos: readonly PontoDoProgresso[];
}

/** A tela da evolução das metas de um assistido (E27), com a versão em tabela de cada gráfico. */
export function ProgressoDoAssistido({
  nome,
  assistidoId,
  metas,
  periodos,
  pontos,
}: Readonly<Props>) {
  const visao = useVisao();
  const progresso = calcularProgresso(metas, pontos, periodos);
  const mediana = useMedianaDaCarteira(assistidoId, progresso);
  if (progresso === null) return null;
  const ordenados = [...periodos].reverse();
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <VoltarParaEvolucoes />
        <AcoesDoRelatorio
          nome={nome}
          assistidoId={assistidoId}
          progresso={progresso}
          mediana={mediana}
          periodos={periodos}
        />
      </div>
      <HeroDoProgresso nome={nome} progresso={progresso} periodos={ordenados} mediana={mediana} />
      <CartoesDeContagem<FiltroDoProgresso>
        rotulo="Situação das metas no gráfico"
        colunas={4}
        escolhido={visao.filtro}
        aoEscolher={visao.escolher}
        cartoes={CARTOES.map((c) => ({ ...c, total: progresso.contagem[c.valor] }))}
      />
      <Cabecalho visao={visao} />
      {visao.tabela ? (
        <TabelaDoProgresso
          nome={nome}
          progresso={progresso}
          mediana={mediana}
          metas={filtrarProgresso(progresso.metas, visao.filtro)}
        />
      ) : (
        <Graficos progresso={progresso} periodos={ordenados} filtro={visao.filtro} />
      )}
      <AcoesDoProgresso assistidoId={assistidoId} periodos={periodos} />
    </>
  );
}
