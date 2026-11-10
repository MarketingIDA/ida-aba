import { useQuery } from '@tanstack/react-query';
import { ChevronRight, CircleCheck, Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import { SITUACAO, situacaoDe } from '@/features/evolucoes/logica';
import { evolucoesDoMesOptions, useCriarEvolucao } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';
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

function Escolha({ mesAberto }: Readonly<{ mesAberto: string }>) {
  const lista = useQuery(evolucoesDoMesOptions(mesAberto));
  const criar = useCriarEvolucao();
  const navigate = useNavigate();
  const linhas = lista.data ?? [];
  const livres = linhas.filter((l) => l.evolucao === null);
  const incluidas = linhas.filter((l) => l.evolucao !== null);
  const escolher = (assistidoId: number) => {
    criar.mutate(assistidoId, { onSuccess: (id) => void navigate(`/evolucoes/${id}`) });
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
      {lista.isPending && <p role="status">Carregando a carteira…</p>}
      {criar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(criar.error) ? criar.error.message : 'Não foi possível criar agora.'}
        </p>
      )}
      {lista.isSuccess && <Aviso total={linhas.length} livres={livres.length} mes={mesAberto} />}
      <ul
        className="flex flex-col gap-2"
        aria-label="Sem evolução neste mês"
        aria-busy={criar.isPending}
      >
        {livres.map((l) => (
          <Item
            key={l.assistidoId}
            linha={l}
            aoEscolher={() => {
              escolher(l.assistidoId);
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

/** "Nova evolução mensal": o coordenador escolhe um assistido da carteira sem evolução (E01). */
export function NovaEvolucao({ mesAberto }: Readonly<{ mesAberto: string }>) {
  const [aberta, setAberta] = useState(false);
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
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent
          side="right"
          className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"
        >
          <SheetHeader className="gap-1 border-b border-borda bg-superficie py-5 pr-12 pl-5">
            <SheetTitle className="font-display text-xl font-bold text-marinho">
              Nova evolução mensal
            </SheetTitle>
            <SheetDescription className="text-sm font-semibold text-texto-2">
              Evolução de {formatarMesLongo(mesAberto)}, com as sessões de{' '}
              {formatarData(inicio, true)} a {formatarData(fim)}. Escolha o assistido.
            </SheetDescription>
          </SheetHeader>
          {aberta && <Escolha mesAberto={mesAberto} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
