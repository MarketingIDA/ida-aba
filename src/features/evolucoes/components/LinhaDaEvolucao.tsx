import { Situacao } from '@/components/Situacao';
import type { LinhaDoMes } from '@/features/evolucoes/api/evolucoes.api';
import { SITUACAO, situacaoDe } from '@/features/evolucoes/logica';
import { ROTULO_DO_TURNO } from '@/utils/turno';
import { cn } from '@/lib/utils';
import { iniciais } from '@/utils/iniciais';

interface Props {
  linha: LinhaDoMes;
  /** Na coordenação geral, a linha mostra unidade, turno e coordenador; no coordenador, o plano. */
  visaoGeral: boolean;
  /** Nome curto do coordenador da carteira, quando a lista de coordenadores já chegou. */
  coordenador: string | null;
  nomeDoMes: string;
}

function Partes({ conferidas }: Readonly<{ conferidas: number }>) {
  return (
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
  );
}

function Andamento({ linha }: Readonly<{ linha: LinhaDoMes }>) {
  const situacao = situacaoDe(linha);
  if (situacao === 'em_conferencia') {
    return <Partes conferidas={linha.evolucao?.partesConferidas ?? 0} />;
  }
  if (situacao === 'sem') return null;
  return (
    <span className="text-caption font-bold text-apagado">
      {situacao === 'concluida' ? 'No arquivo do mês' : 'No arquivo enviado'}
    </span>
  );
}

function Detalhe({ linha, visaoGeral, coordenador, nomeDoMes }: Readonly<Props>) {
  const local = `${linha.unidadeSigla} ${ROTULO_DO_TURNO[linha.turno].toLowerCase()}`;
  const contexto = coordenador === null ? local : `${local} · ${coordenador}`;
  const plano = linha.plano ?? <span className="text-bloq-text">plano em branco</span>;
  const depois = visaoGeral ? contexto : plano;
  if (linha.evolucao === null) {
    return (
      <span className="truncate">
        {visaoGeral ? contexto : `Ainda sem evolução de ${nomeDoMes}`}
      </span>
    );
  }
  return (
    <>
      <span className="font-mono text-xs">{linha.evolucao.codigo}</span>
      <span aria-hidden="true">·</span>
      <span className="truncate">{depois}</span>
    </>
  );
}

/** Uma linha da lista: avatar, nome, código e plano, andamento das partes e a situação. */
export function LinhaDaEvolucao(props: Readonly<Props>) {
  const { linha, visaoGeral } = props;
  const { rotulo, tom } = SITUACAO[situacaoDe(linha)];
  return (
    // A coluna da situação tem largura fixa no desktop: as do meio ficam alinhadas entre as linhas.
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_8rem] sm:px-5 [&>:last-child]:justify-self-end">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-info-soft text-caption font-extrabold text-azul-escuro"
      >
        {iniciais(linha.nome)}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="truncate text-[0.90625rem] leading-tight text-marinho">{linha.nome}</b>
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-caption font-semibold whitespace-nowrap text-apagado">
          <Detalhe {...props} />
        </span>
      </span>
      <span className="hidden truncate text-caption font-bold text-apagado sm:block">
        {visaoGeral
          ? (linha.plano ?? '—')
          : `${linha.unidadeSigla} · ${ROTULO_DO_TURNO[linha.turno]}`}
      </span>
      <span className="hidden sm:block">
        <Andamento linha={linha} />
      </span>
      <Situacao rotulo={rotulo} tom={tom} />
    </li>
  );
}
