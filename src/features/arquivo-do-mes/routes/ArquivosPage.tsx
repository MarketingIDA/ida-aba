import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useState } from 'react';

import { CabecalhoDoMes } from '@/components/CabecalhoDoMes';
import { CartoesDeContagem } from '@/components/CartoesDeContagem';
import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { LinhaDoArquivo } from '@/features/arquivo-do-mes/components/LinhaDoArquivo';
import { arquivosDoMesOptions } from '@/features/arquivo-do-mes/queries';
import { useMesDaUrl } from '@/features/arquivo-do-mes/routes/useMesDaUrl';
import { useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';
import { nomeDoMes } from '@dominio/mes.ts';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

type Filtro = 'todas' | 'enviados' | 'a_chegar';

/** Como cada perfil chama o arquivo que já foi: contas médicas recebe, a coordenação acompanha. */
const TEXTOS = {
  contas_medicas: { perfil: 'Contas médicas', titulo: 'Arquivos recebidos', enviado: 'Recebido' },
  coordenacao_geral: {
    perfil: 'Coordenação geral',
    titulo: 'Arquivos enviados',
    enviado: 'Enviado',
  },
} as const;

function filtrar(carteiras: readonly CarteiraDoMes[], filtro: Filtro | null): CarteiraDoMes[] {
  // Os que já chegaram primeiro, do mais novo ao mais antigo; depois os que faltam.
  const enviados = carteiras
    .filter((c) => c.arquivo !== null)
    .sort((a, b) => (b.arquivo?.enviadoEm ?? '').localeCompare(a.arquivo?.enviadoEm ?? ''));
  const aChegar = carteiras.filter((c) => c.arquivo === null);
  if (filtro === 'enviados') return enviados;
  return filtro === 'a_chegar' ? aChegar : [...enviados, ...aChegar];
}

function ListaVazia({ todosChegaram }: Readonly<{ todosChegaram: boolean }>) {
  return (
    <EmptyState
      icone={Inbox}
      titulo={todosChegaram ? 'Todos os arquivos chegaram' : 'Nenhum arquivo ainda'}
      descricao={
        todosChegaram
          ? 'Cada carteira já enviou o arquivo deste mês.'
          : 'O arquivo aparece aqui quando a coordenação da unidade envia.'
      }
    />
  );
}

interface PropsDaLista {
  carteiras: readonly CarteiraDoMes[];
  mes: string;
  aberto: boolean;
  geral: boolean;
}

/** Os cards (cada um abre a lista do que conta) e a lista das carteiras do mês. */
function ListaDosArquivos({ carteiras, mes, aberto, geral }: Readonly<PropsDaLista>) {
  const [filtro, setFiltro] = useState<Filtro | null>(null);
  const textos = TEXTOS[geral ? 'coordenacao_geral' : 'contas_medicas'];
  const enviados = carteiras.filter((c) => c.arquivo !== null).length;
  const lista = filtrar(carteiras, filtro);
  return (
    <>
      <CartoesDeContagem<Filtro>
        rotulo={`Arquivos de ${nomeDoMes(mes)}`}
        escolhido={filtro}
        aoEscolher={setFiltro}
        cartoes={[
          { valor: 'todas', rotulo: 'Carteiras', total: carteiras.length, tom: 'neutro' },
          { valor: 'enviados', rotulo: `${textos.enviado}s`, total: enviados, tom: 'ok' },
          {
            valor: 'a_chegar',
            rotulo: aberto ? 'A chegar' : 'Não chegaram',
            total: carteiras.length - enviados,
            tom: 'alerta',
          },
        ]}
      />
      {lista.length === 0 ? (
        <ListaVazia todosChegaram={filtro === 'a_chegar'} />
      ) : (
        <ul
          aria-label={`Arquivos de ${nomeDoMes(mes)}`}
          className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
        >
          {lista.map((carteira) => (
            <LinhaDoArquivo
              key={carteira.carteiraId}
              carteira={carteira}
              rotuloDoEnviado={textos.enviado}
              aberto={aberto}
              comLink={geral}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Os arquivos do mês de todas as carteiras (E24): os que já chegaram, com as evoluções de cada um,
 * e os que ainda vão chegar. Contas médicas recebe; a coordenação geral acompanha.
 */
export function ArquivosPage() {
  const geral = useUsuario()?.papel === 'coordenacao_geral';
  const textos = TEXTOS[geral ? 'coordenacao_geral' : 'contas_medicas'];
  const { mes, mesAberto, meses, aberto, prazo, mudar } = useMesDaUrl();
  const consulta = useQuery(arquivosDoMesOptions(mes));

  return (
    <section className="flex flex-col gap-5">
      <CabecalhoDoMes
        icone={Inbox}
        sobretitulo={textos.perfil}
        titulo={textos.titulo}
        mes={mes}
        mesAberto={mesAberto}
        meses={meses}
        subtitulo={`Cada carteira envia um arquivo do mês, com todas as evoluções dela e o código de cada uma. ${prazo}`}
        aoMudarMes={mudar}
      />
      {consulta.isPending && (
        <div
          role="status"
          aria-label="Carregando os arquivos"
          className="h-64 animate-pulse rounded-xl bg-neutro-suave"
        />
      )}
      {consulta.isError && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar os arquivos"
          mensagem={ehErroApp(consulta.error) ? consulta.error.message : SEM_FORMATO}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      )}
      {consulta.isSuccess && consulta.data.length === 0 && (
        <EmptyState
          icone={Inbox}
          titulo="Nenhuma carteira com assistidos neste mês"
          descricao="As carteiras aparecem aqui quando a coordenação geral cadastra os assistidos de cada unidade e turno."
        />
      )}
      {consulta.isSuccess && consulta.data.length > 0 && (
        <ListaDosArquivos
          key={mes}
          carteiras={consulta.data}
          mes={mes}
          aberto={aberto}
          geral={geral}
        />
      )}
    </section>
  );
}
