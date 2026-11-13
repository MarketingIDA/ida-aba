import { useQuery } from '@tanstack/react-query';
import { FileText, Users } from 'lucide-react';

import { CabecalhoDoMes } from '@/components/CabecalhoDoMes';
import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { NovaEvolucao } from '@/features/evolucoes/components/NovaEvolucao';
import { coordenadoresOptions, evolucoesDoMesOptions } from '@/features/evolucoes/queries';
import { ConteudoDoMes } from '@/features/evolucoes/routes/ConteudoDoMes';
import { useFiltrosDaUrl } from '@/features/evolucoes/routes/useFiltrosDaUrl';
import { deQuemEALista, periodoEPrazo } from '@/features/evolucoes/textos';
import { useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';
import { hojeNaClinica, mesDaEvolucao, mesesRecentes } from '@dominio/mes.ts';

/** Quantos meses a escolha do mês oferece, do aberto para trás. */
const MESES_NA_ESCOLHA = 6;

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

function Carregando() {
  return (
    <div role="status" className="flex flex-col gap-4" aria-label="Carregando as evoluções">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-[92px] animate-pulse rounded-xl bg-neutro-suave" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-neutro-suave" />
    </div>
  );
}

function CarteiraVazia({ visaoGeral }: Readonly<{ visaoGeral: boolean }>) {
  return (
    <EmptyState
      icone={Users}
      titulo={visaoGeral ? 'Nenhum assistido cadastrado' : 'Sua carteira ainda não tem assistidos'}
      descricao={
        visaoGeral
          ? 'Os assistidos aparecem aqui quando forem cadastrados nas carteiras das unidades.'
          : 'A coordenação geral monta a carteira de cada unidade e turno. Quando ela incluir os seus assistidos, eles aparecem aqui.'
      }
    />
  );
}

/** Evoluções do mês: a carteira (ou todas as unidades) com a situação de cada evolução. */
export function EvolucoesPage() {
  const visaoGeral = useUsuario()?.papel === 'coordenacao_geral';
  const hoje = hojeNaClinica(new Date());
  const mesAberto = mesDaEvolucao(hoje);
  const filtros = useFiltrosDaUrl(mesAberto, mesesRecentes(mesAberto, MESES_NA_ESCOLHA));
  const evolucoes = useQuery(evolucoesDoMesOptions(filtros.mes));
  const coordenadores = useQuery({ ...coordenadoresOptions(), enabled: visaoGeral });
  const linhas = evolucoes.data ?? [];

  return (
    <section className="flex flex-col gap-5">
      <CabecalhoDoMes
        icone={FileText}
        sobretitulo="Evoluções mensais"
        titulo="Evoluções"
        mes={filtros.mes}
        mesAberto={mesAberto}
        meses={mesesRecentes(mesAberto, MESES_NA_ESCOLHA)}
        subtitulo={deQuemEALista(visaoGeral, linhas) + periodoEPrazo(filtros.mes, mesAberto, hoje)}
        aoMudarMes={(mes) => {
          filtros.mudar({ mes: mes === mesAberto ? '' : mes });
        }}
        acao={visaoGeral ? null : <NovaEvolucao mesAberto={mesAberto} />}
      />
      {evolucoes.isPending && <Carregando />}
      {evolucoes.isError && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar as evoluções"
          mensagem={ehErroApp(evolucoes.error) ? evolucoes.error.message : SEM_FORMATO}
          aoTentarDeNovo={() => void evolucoes.refetch()}
        />
      )}
      {evolucoes.isSuccess && linhas.length === 0 && <CarteiraVazia visaoGeral={visaoGeral} />}
      {evolucoes.isSuccess && linhas.length > 0 && (
        <ConteudoDoMes
          linhas={linhas}
          filtros={filtros}
          visaoGeral={visaoGeral}
          coordenadores={coordenadores.data ?? []}
          mesAberto={mesAberto}
          hoje={hoje}
        />
      )}
    </section>
  );
}
