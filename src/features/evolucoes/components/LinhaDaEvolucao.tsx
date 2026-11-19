import {
  ChartLine,
  ChevronRight,
  CircleCheck,
  FileUp,
  type LucideIcon,
  Pencil,
  Plus,
  Send,
  Undo2,
} from 'lucide-react';
import { Link } from 'react-router';

import { Situacao } from '@/components/Situacao';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import {
  SITUACAO,
  situacaoDe,
  type Situacao as ChaveDaSituacao,
} from '@/features/evolucoes/logica';
import { cn } from '@/lib/utils';
import { iniciais } from '@/utils/iniciais';
import { ROTULO_DO_TURNO } from '@/utils/turno';

interface Props {
  linha: LinhaDoMes;
  /** Na coordenação geral, a linha mostra unidade, turno e coordenador; no coordenador, o plano. */
  visaoGeral: boolean;
  /** Nome curto do coordenador da carteira, quando a lista de coordenadores já chegou. */
  coordenador: string | null;
  nomeDoMes: string;
  /** No mês aberto, o coordenador começa a evolução de quem ainda não tem pela própria linha. */
  noMesAberto: boolean;
}

/** O ícone de cada situação na pílula, como no protótipo. */
const ICONE: Record<ChaveDaSituacao, LucideIcon> = {
  sem: Plus,
  em_conferencia: Pencil,
  concluida: CircleCheck,
  enviada: Send,
};

const ETIQUETA =
  'inline-flex items-center gap-1 rounded-full px-2 py-px text-[0.72rem] font-extrabold whitespace-nowrap';

function Partes({ linha }: Readonly<{ linha: LinhaDoMes }>) {
  const conferidas = linha.evolucao?.partesConferidas ?? 0;
  return (
    <span className="flex flex-col items-start gap-2">
      <span
        className="flex items-center gap-[3px]"
        title={`${String(conferidas)} de 4 partes conferidas`}
      >
        {[1, 2, 3, 4].map((parte) => (
          <i
            key={parte}
            aria-hidden="true"
            className={cn(
              'block h-1.5 w-4 rounded-full',
              parte <= conferidas ? 'bg-ok' : 'bg-neutro-suave',
            )}
          />
        ))}
        <small className="ml-1.5 text-xs font-extrabold text-texto-2 num">
          {conferidas}/4 partes
        </small>
      </span>
      {/* Devolvida segue em conferência; a etiqueta avisa que há um motivo a resolver (E13). */}
      {linha.evolucao?.devolvida === true && (
        <span className={cn(ETIQUETA, 'bg-bloq-soft text-bloq-text')}>
          <Undo2 aria-hidden="true" className="size-3" strokeWidth={2.2} />
          devolvida
        </span>
      )}
    </span>
  );
}

function Andamento({ linha, visaoGeral, noMesAberto }: Readonly<Props>) {
  const situacao = situacaoDe(linha);
  if (situacao === 'em_conferencia') return <Partes linha={linha} />;
  if (situacao === 'sem') {
    if (visaoGeral || !noMesAberto) return null;
    return (
      <Link
        to="/evolucoes?nova=1"
        className="relative z-10 inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border-[1.5px] border-borda-forte bg-superficie px-3 text-caption font-extrabold text-marinho foco-anel hover:border-azul hover:text-azul active:scale-[0.97]"
      >
        <FileUp aria-hidden="true" className="size-[15px]" />
        Importar do Tita
      </Link>
    );
  }
  return (
    <span className="text-[0.78rem] font-bold text-apagado">
      {situacao === 'concluida' ? 'Concluída · no arquivo do mês' : 'Enviada no arquivo do mês'}
    </span>
  );
}

function Detalhe({ linha, visaoGeral, coordenador, nomeDoMes }: Readonly<Props>) {
  const local = `${linha.unidadeSigla} ${ROTULO_DO_TURNO[linha.turno].toLowerCase()}`;
  const contexto = coordenador === null ? local : `${local} · ${coordenador}`;
  const plano = linha.plano ?? <span className="text-bloq-text">plano em branco</span>;
  if (linha.evolucao === null) {
    return (
      <span className="truncate">
        {visaoGeral ? contexto : `Ainda sem evolução de ${nomeDoMes}`}
      </span>
    );
  }
  return (
    <>
      <span className="text-[0.72rem] font-extrabold tracking-[0.02em] num">
        {linha.evolucao.codigo}
      </span>
      <span aria-hidden="true">·</span>
      <span className="truncate">{visaoGeral ? contexto : plano}</span>
    </>
  );
}

function Nome({ linha }: Readonly<{ linha: LinhaDoMes }>) {
  return (
    <b className="block truncate text-[0.90625rem] leading-tight font-extrabold text-marinho">
      {linha.evolucao === null ? (
        linha.nome
      ) : (
        // A linha toda é o alvo do toque: o ::after do link cobre o `li`.
        <Link
          to={`/evolucoes/${linha.evolucao.id}`}
          className="rounded-sm foco-anel after:absolute after:inset-0 after:content-['']"
        >
          {linha.nome}
        </Link>
      )}
    </b>
  );
}

/**
 * Uma linha da lista, como a do protótipo: avatar, nome, código e plano, unidade, andamento, a
 * situação, o gráfico das metas (E27) e a seta. No celular ficam o nome, a situação e o gráfico.
 */
export function LinhaDaEvolucao(props: Readonly<Props>) {
  const { linha, visaoGeral } = props;
  const chave = situacaoDe(linha);
  return (
    <li className="relative grid grid-cols-[36px_minmax(0,1fr)_auto_36px_20px] items-center gap-3.5 bg-superficie px-4 py-3 transition-colors duration-150 hover:bg-superficie-2 min-[861px]:grid-cols-[36px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto_36px_20px] min-[861px]:px-[22px] min-[861px]:py-[13px]">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-info-soft text-[0.78rem] font-extrabold text-azul-escuro"
      >
        {iniciais(linha.nome)}
      </span>
      <span className="flex min-w-0 flex-col">
        <Nome linha={linha} />
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[0.78rem] font-semibold whitespace-nowrap text-apagado">
          <Detalhe {...props} />
        </span>
      </span>
      <span className="hidden truncate text-[0.8125rem] font-bold text-apagado min-[861px]:block">
        {visaoGeral
          ? (linha.plano ?? '—')
          : `${linha.unidadeSigla} · ${ROTULO_DO_TURNO[linha.turno]}`}
      </span>
      <span className="hidden min-[861px]:block">
        <Andamento {...props} />
      </span>
      <Situacao rotulo={SITUACAO[chave].rotulo} tom={SITUACAO[chave].tom} icone={ICONE[chave]} />
      <Link
        to={`/progresso/${String(linha.assistidoId)}`}
        aria-label={`Evolução das metas de ${linha.nome}`}
        title="Evolução das metas"
        className="relative z-10 grid size-9 place-items-center rounded-[11px] border border-info-border bg-info-soft text-azul foco-anel transition-[background-color,transform] duration-150 hover:bg-info-border active:scale-[0.94]"
      >
        <ChartLine aria-hidden="true" className="size-[18px]" />
      </Link>
      <span aria-hidden="true" className="text-tenue">
        {linha.evolucao !== null && <ChevronRight className="size-[18px]" />}
      </span>
    </li>
  );
}
