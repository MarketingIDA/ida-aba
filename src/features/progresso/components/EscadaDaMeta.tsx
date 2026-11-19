import { AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import { SITUACAO_DA_META } from '@/features/cadastros/metas';
import { EscadaSvg, type PropsDaEscada } from '@/features/progresso/components/EscadaSvg';
import { mesDoPeriodo, nomeDoNivel } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import type { AnaliseDaMeta } from '@dominio/progresso.ts';

/** O degrau de agora e quantos degraus subiu ou desceu desde o primeiro nível lido. */
function Agora({ analise }: Readonly<{ analise: AnaliseDaMeta }>) {
  const { primeiro, ultimo } = analise;
  if (ultimo === null || primeiro === null)
    return <span className="text-apagado">Sem nível lido</span>;
  const delta = (ultimo.nivel ?? 0) - (primeiro.nivel ?? 0);
  const Seta = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-2 text-marinho">
      <b>{nomeDoNivel(ultimo.nivel)}</b>
      <span className="inline-flex items-center gap-1 text-caption text-texto-2">
        {delta !== 0 && <Seta aria-hidden="true" className="size-3.5" />}
        {delta === 0 ? 'mesmo degrau' : plural(Math.abs(delta), 'degrau', 'degraus')}
      </span>
    </span>
  );
}

function Alerta({ texto }: Readonly<{ texto: string }>) {
  return (
    <p className="inline-flex items-center gap-1 text-caption font-bold text-alerta-text">
      <AlertTriangle aria-hidden="true" className="size-3.5" />
      {texto}
    </p>
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
    <div className="flex flex-col gap-1 rounded-xl border border-borda bg-superficie-2 p-4 text-caption font-semibold text-apagado">
      <b className="text-sm text-marinho">{vazio[0]}</b>
      {vazio[1]}
    </div>
  );
}

function Alertas({ analise, periodos }: Readonly<PropsDaEscada>) {
  const ultimoMes = periodos.at(-1);
  return (
    <>
      {analise.parada > 0 && (
        <Alerta texto={`Mesmo degrau há ${plural(analise.parada, 'semana', 'semanas')}`} />
      )}
      {analise.sumiu && ultimoMes !== undefined && (
        <Alerta texto={`Sem registro em ${mesDoPeriodo(ultimoMes.inicio)}`} />
      )}
    </>
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
      className={`flex flex-col gap-2 rounded-2xl border bg-superficie p-4 shadow-sm foco-anel ${borda}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-info-soft px-2 py-0.5 text-caption font-bold text-azul">
          {meta.programa ?? 'sem programa'}
        </span>
        <span className="ml-auto">
          <Situacao rotulo={situacao.rotulo} tom={situacao.tom} />
        </span>
      </div>
      <Alertas {...props} />
      <p className="text-sm font-extrabold text-marinho">{meta.texto}</p>
      <Corpo {...props} />
      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-2.5 text-caption font-bold">
        <Agora analise={analise} />
        <span className="ml-auto text-apagado">
          {plural(analise.pontos.length, 'sessão', 'sessões')}
          {analise.semNivel > 0 && ` · ${String(analise.semNivel)} sem nível`}
        </span>
      </div>
    </article>
  );
}
