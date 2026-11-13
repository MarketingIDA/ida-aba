import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Users } from 'lucide-react';

import { CabecalhoDoMes } from '@/components/CabecalhoDoMes';
import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { CartaoDaCarteira } from '@/features/arquivo-do-mes/components/CartaoDaCarteira';
import { arquivosDoMesOptions } from '@/features/arquivo-do-mes/queries';
import { useMesDaUrl } from '@/features/arquivo-do-mes/routes/useMesDaUrl';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

/**
 * O arquivo do mês do coordenador (E24): o que falta para enviar, o envio a contas médicas e,
 * depois dele, o recibo. Quem coordena duas carteiras vê e envia um arquivo de cada.
 */
export function ArquivoDoMesPage() {
  const { mes, mesAberto, meses, aberto, prazo, mudar } = useMesDaUrl();
  const consulta = useQuery(arquivosDoMesOptions(mes));
  const minhas = (consulta.data ?? []).filter((carteira) => carteira.minha);

  return (
    <section className="flex flex-col gap-5">
      <CabecalhoDoMes
        icone={FolderOpen}
        sobretitulo="Coordenação de unidade"
        titulo="Arquivo do mês"
        mes={mes}
        mesAberto={mesAberto}
        meses={meses}
        subtitulo={`Vai a contas médicas o arquivo inteiro da carteira, não cada evolução. ${prazo}`}
        aoMudarMes={mudar}
      />
      {consulta.isPending && (
        <div
          role="status"
          aria-label="Carregando o arquivo do mês"
          className="h-56 animate-pulse rounded-xl bg-neutro-suave"
        />
      )}
      {consulta.isError && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar o arquivo do mês"
          mensagem={ehErroApp(consulta.error) ? consulta.error.message : SEM_FORMATO}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      )}
      {consulta.isSuccess && minhas.length === 0 && (
        <EmptyState
          icone={Users}
          titulo="Sua carteira ainda não tem assistidos"
          descricao="O arquivo do mês junta as evoluções dos assistidos da carteira. A coordenação geral monta a carteira de cada unidade e turno."
        />
      )}
      {minhas.map((carteira) => (
        <CartaoDaCarteira key={carteira.carteiraId} carteira={carteira} mes={mes} aberto={aberto} />
      ))}
    </section>
  );
}
