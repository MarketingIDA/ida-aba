import { AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import { SITUACAO_DA_META } from '@/features/cadastros/metas';
import { EscadaSvg, type PropsDaEscada } from '@/features/progresso/components/EscadaSvg';
import { mesDoPeriodo, nomeDoNivel } from '@/features/progresso/textos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/textos';
import type { AnaliseDaMeta } from '@dominio/progresso.ts';

/** As cinco barrinhas do degrau, acesas até o de agora (o `.degraus` do protótipo). */
function Degraus({ nivel }: Readonly<{ nivel: number }>) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-end gap-0.5">
      {[1, 2, 3, 4, 5].map((k) => (
        <i
          key={k}
          className={cn('block w-[5px] rounded-[2px]', k <= nivel ? 'bg-azul' : 'bg-info-border')}
          style={{ height: `${String(4 + k * 2)}px` }}
        />
      ))}
    </span>
  );
}

/** O degrau de agora e quantos degraus subiu ou desceu desde o primeiro nível lido. */
function Agora({ analise }: Readonly<{ analise: AnaliseDaMeta }>) {
  const { primeiro, ultimo } = analise;
  if (ultimo === null || primeiro === null)
    return <span className="text-apagado">Sem nível lido</span>;
  const delta = (ultimo.nivel ?? 0) - (primeiro.nivel ?? 0);
  const Seta = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <>
      <span className="inline-flex items-center gap-2 text-marinho">
        <Degraus nivel={ultimo.nivel ?? 0} />
        <b className="text-[0.84rem]">{nomeDoNivel(ultimo.nivel)}</b>
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-[3px] font-extrabold',
          delta > 0 && 'text-ok-text',
          delta < 0 && 'text-alerta-text',
          delta === 0 && 'text-apagado',
        )}
      >
        {delta !== 0 && <Seta aria-hidden="true" className="size-[13px]" />}
        {delta === 0 ? 'mesmo degrau' : plural(Math.abs(delta), 'degrau', 'degraus')}
      </span>
    </>
  );
}

function Alerta({ texto }: Readonly<{ texto: string }>) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-alerta-soft px-2 py-px text-[0.72rem] font-extrabold whitespace-nowrap text-alerta-text">
      <AlertTriangle aria-hidden="true" className="size-3" />
      {texto}
    </span>
  );
}

/** Por que a meta não tem escada, ou `null` quando tem. */
function semEscada(analise: AnaliseDaMeta): [string, string] | null {
  if (analise.meta.programa === null) {
    return [
      'Meta sem programa no cadastro',
      'Sem programa, a IA não tem onde ler o nível de apoio.',
    ];
  }
  if (analise.pontos.length === 0) {
    return ['Nenhuma sessão com este programa', 'O programa não aparece nas análises lidas.'];
  }
  return null;
}

function Corpo(props: Readonly<PropsDaEscada>) {
  const vazio = semEscada(props.analise);
  if (vazio === null) return <EscadaSvg {...props} />;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-borda bg-superficie-2 px-4 py-[18px] text-[0.78rem] font-semibold text-apagado">
      <b className="text-[0.84rem] text-marinho">{vazio[0]}</b>
      {vazio[1]}
    </div>
  );
}

function Alertas({ analise, periodos }: Readonly<PropsDaEscada>) {
  const ultimoMes = periodos.at(-1);
  const sumiu = analise.sumiu && ultimoMes !== undefined;
  if (analise.parada === 0 && !sumiu) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {analise.parada > 0 && (
        <Alerta texto={`mesmo degrau há ${plural(analise.parada, 'semana', 'semanas')}`} />
      )}
      {sumiu && <Alerta texto={`sem registro em ${mesDoPeriodo(ultimoMes.inicio)}`} />}
    </div>
  );
}

/** O card de uma meta: programa, situação, alertas, a escada e o degrau de agora. */
export function EscadaDaMeta(props: Readonly<PropsDaEscada>) {
  const { analise } = props;
  const { meta } = analise;
  const situacao = SITUACAO_DA_META[meta.situacao];
  const borda = analise.atencao
    ? 'border-alerta-border shadow-[inset_0_4px_0_var(--alerta)]'
    : 'border-borda';
  return (
    <article
      id={`meta-${String(meta.id)}`}
      tabIndex={-1}
      className={`flex flex-col gap-2 rounded-xl border bg-superficie px-[18px] pt-4 pb-3.5 shadow-sm foco-anel ${borda}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-info-soft px-2 py-px text-[0.72rem] font-extrabold text-info-text">
          {meta.programa ?? 'sem programa'}
        </span>
        <span className="ml-auto">
          <Situacao rotulo={situacao.rotulo} tom={situacao.tom} pequena />
        </span>
      </div>
      <Alertas {...props} />
      <p className="text-sm leading-[1.4] font-extrabold text-marinho">{meta.texto}</p>
      <Corpo {...props} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-borda pt-2.5 text-[0.78rem] font-bold">
        <Agora analise={analise} />
        <span className="ml-auto text-apagado">
          {plural(analise.pontos.length, 'sessão', 'sessões')}
          {analise.semNivel > 0 && ` · ${String(analise.semNivel)} sem nível`}
        </span>
      </div>
    </article>
  );
}
