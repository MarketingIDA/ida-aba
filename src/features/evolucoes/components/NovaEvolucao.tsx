import { useQuery } from '@tanstack/react-query';
import { ChevronRight, CircleCheck, Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Janela } from '@/components/Janela';
import { Button } from '@/components/ui/button';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import { SITUACAO, situacaoDe } from '@/features/evolucoes/logica';
import { ComecarPeloTita } from '@/features/evolucoes/components/ComecarPeloTita';
import { evolucoesDoMesOptions } from '@/features/evolucoes/queries';
import { iniciais } from '@/utils/iniciais';
import { formatarData, formatarMesLongo, nomeDoMes, periodoAnalisado } from '@dominio/mes.ts';

const ITEM =
  'flex w-full items-center gap-3 rounded-md border border-borda bg-superficie px-3 py-2.5 text-left';

function Item({ linha, aoEscolher }: Readonly<{ linha: LinhaDoMes; aoEscolher?: () => void }>) {
  const livre = aoEscolher !== undefined;
  const detalhe = livre
    ? (linha.plano ?? 'plano em branco')
    : `Já tem evolução · ${SITUACAO[situacaoDe(linha)].rotulo.toLowerCase()}`;
  const conteudo = (
    <>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-info-soft text-caption font-extrabold text-azul-escuro"
      >
        {iniciais(linha.nome)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="truncate text-sm text-marinho">{linha.nome}</b>
        <small className="truncate text-caption font-semibold text-apagado">{detalhe}</small>
      </span>
      {livre ? (
        <ChevronRight aria-hidden="true" className="size-4 text-apagado" />
      ) : (
        <Lock aria-hidden="true" className="size-4 text-tenue" />
      )}
    </>
  );
  if (!livre) return <li className={`${ITEM} opacity-70`}>{conteudo}</li>;
  return (
    <li>
      <button type="button" onClick={aoEscolher} className={`${ITEM} foco-anel hover:border-azul`}>
        {conteudo}
      </button>
    </li>
  );
}

/** Carteira vazia, ou toda com evolução no mês. */
function Aviso({ total, livres, mes }: Readonly<{ total: number; livres: number; mes: string }>) {
  if (total === 0) {
    return (
      <p className="text-sm font-bold text-texto-2">
        Sua carteira ainda não tem assistidos. A coordenação geral inclui os assistidos na carteira.
      </p>
    );
  }
  if (livres > 0) return null;
  return (
    <p className="flex items-center gap-2 text-sm font-bold text-ok-text">
      <CircleCheck aria-hidden="true" className="size-4" />
      Todos os assistidos da carteira já têm evolução de {nomeDoMes(mes)}.
    </p>
  );
}

function Escolha({
  mesAberto,
  assistidoPedido,
}: Readonly<{ mesAberto: string; assistidoPedido: number | null }>) {
  const lista = useQuery(evolucoesDoMesOptions(mesAberto));
  const [escolhido, setEscolhido] = useState<number | null>(assistidoPedido);
  const linhas = lista.data ?? [];
  const livres = linhas.filter((l) => l.evolucao === null);
  const incluidas = linhas.filter((l) => l.evolucao !== null);
  const linhaEscolhida = livres.find((l) => l.assistidoId === escolhido);
  if (linhaEscolhida !== undefined) {
    return (
      <ComecarPeloTita
        key={linhaEscolhida.assistidoId}
        linha={linhaEscolhida}
        mesAberto={mesAberto}
        aoVoltar={() => {
          setEscolhido(null);
        }}
      />
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
      {lista.isPending && <p role="status">Carregando a carteira…</p>}
      {lista.isSuccess && <Aviso total={linhas.length} livres={livres.length} mes={mesAberto} />}
      <ul className="flex flex-col gap-2" aria-label="Sem evolução neste mês">
        {livres.map((l) => (
          <Item
            key={l.assistidoId}
            linha={l}
            aoEscolher={() => {
              setEscolhido(l.assistidoId);
            }}
          />
        ))}
      </ul>
      {incluidas.length > 0 && <p className="mt-2 rotulo text-apagado">Já incluídas</p>}
      <ul className="flex flex-col gap-2">
        {incluidas.map((l) => (
          <Item key={l.assistidoId} linha={l} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Aberta pelo botão da tela, pelo do menu (`?nova=1`) ou pelo "Importar do Tita" da linha, que já
 * traz o assistido (`&assistido=`); fechar tira o pedido da URL.
 */
function useAberta(): [boolean, (aberta: boolean) => void, number | null] {
  const [estado, setEstado] = useState(false);
  const [params, setParams] = useSearchParams();
  const pedida = params.get('nova') === '1';
  const assistido = Number(params.get('assistido'));
  const mudar = (aberta: boolean) => {
    setEstado(aberta);
    if (!aberta && pedida) {
      const sem = new URLSearchParams(params);
      sem.delete('nova');
      sem.delete('assistido');
      setParams(sem, { replace: true });
    }
  };
  const pedido = pedida && Number.isInteger(assistido) && assistido > 0 ? assistido : null;
  return [estado || pedida, mudar, pedido];
}

/**
 * "Nova evolução mensal": o coordenador escolhe um assistido da carteira sem evolução (E01). Abre em
 * janela no centro da tela (até 26/11/2026 era uma gaveta à direita).
 */
export function NovaEvolucao({ mesAberto }: Readonly<{ mesAberto: string }>) {
  const [aberta, setAberta, assistidoPedido] = useAberta();
  const { inicio, fim } = periodoAnalisado(mesAberto);
  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          setAberta(true);
        }}
      >
        <Plus aria-hidden="true" />
        Nova evolução mensal
      </Button>
      <Janela
        aberta={aberta}
        aoMudar={setAberta}
        titulo="Nova evolução mensal"
        descricao={
          <>
            Evolução de {formatarMesLongo(mesAberto)}, com as sessões de{' '}
            {formatarData(inicio, true)} a {formatarData(fim)}. Comece pelo PDF do Tita.
          </>
        }
      >
        {aberta && <Escolha mesAberto={mesAberto} assistidoPedido={assistidoPedido} />}
      </Janela>
    </>
  );
}
