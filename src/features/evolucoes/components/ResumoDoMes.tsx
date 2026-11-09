import { SITUACAO, SITUACOES, type Situacao } from '@/features/evolucoes/logica';
import { cn } from '@/lib/utils';

const PONTO = { neutro: 'bg-tenue', alerta: 'bg-alerta', info: 'bg-azul', ok: 'bg-ok' } as const;

const LEGENDA: Record<Situacao, string> = {
  sem: 'falta importar',
  em_conferencia: 'rascunho da IA',
  concluida: 'no arquivo do mês',
  enviada: 'no arquivo enviado',
};

interface Props {
  total: number;
  /** "Carteira" para o coordenador; "Assistidos" para a coordenação geral. */
  rotuloDoTotal: string;
  contagem: Record<Situacao, number>;
  /** "assistidos" na carteira inteira; "no recorte" quando há filtro de unidade ou coordenador. */
  legendaDoTotal: string;
  escolhida: Situacao | null;
  /** Clicar no card filtra a lista; de novo, ou no total, tira o filtro. */
  aoEscolher: (situacao: Situacao | null) => void;
}

const cartao =
  'relative flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left shadow-sm foco-anel transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none';

const numero = 'font-display text-[1.75rem] leading-tight font-bold num';

// O espaço entre os spans faz o nome acessível ler "Concluídas 1 no arquivo do mês"; no flex ele
// não ocupa lugar.

function CartaoDaSituacao({
  situacao,
  contagem,
  escolhida,
  aoEscolher,
}: Readonly<{ situacao: Situacao } & Pick<Props, 'contagem' | 'escolhida' | 'aoEscolher'>>) {
  const marcado = escolhida === situacao;
  const { plural, tom } = SITUACAO[situacao];
  return (
    <button
      type="button"
      aria-pressed={marcado}
      onClick={() => {
        aoEscolher(marcado ? null : situacao);
      }}
      className={cn(
        cartao,
        'bg-superficie',
        marcado
          ? 'border-azul shadow-[0_0_0_3px_var(--info-soft)]'
          : 'border-borda hover:border-borda-forte',
      )}
    >
      <span className="flex items-center gap-1.5 rotulo text-apagado">
        <span aria-hidden="true" className={cn('size-2 rounded-full', PONTO[tom])} />
        {plural}
      </span>{' '}
      <span className={cn(numero, 'text-marinho')}>{contagem[situacao]}</span>{' '}
      <span className="text-xs font-bold text-apagado">{LEGENDA[situacao]}</span>
    </button>
  );
}

/** Os cinco cards do mês: o total e as quatro situações (todo card leva à lista do que conta). */
export function ResumoDoMes({ total, rotuloDoTotal, legendaDoTotal, ...props }: Readonly<Props>) {
  return (
    <div
      role="group"
      aria-label="Situação das evoluções"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
    >
      <button
        type="button"
        aria-pressed={props.escolhida === null}
        onClick={() => {
          props.aoEscolher(null);
        }}
        className={cn(
          cartao,
          'col-span-2 border-transparent bg-gradiente-total text-white sm:col-span-1',
        )}
      >
        <span className="rotulo">{rotuloDoTotal}</span> <span className={numero}>{total}</span>{' '}
        <span className="text-xs font-bold">{legendaDoTotal}</span>
      </button>
      {SITUACOES.map((situacao) => (
        <CartaoDaSituacao key={situacao} situacao={situacao} {...props} />
      ))}
    </div>
  );
}
