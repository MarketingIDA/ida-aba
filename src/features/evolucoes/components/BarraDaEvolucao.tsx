import { CircleCheck, Info, Lock, OctagonX, Pencil, Undo2 } from 'lucide-react';

import { BarraInferior } from '@/components/BarraInferior';
import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { plural } from '@/features/evolucoes/logica';
import { irParaParte, type ResumoDaConferencia } from '@/features/evolucoes/resumo';
import { formatarDataHora } from '@/features/evolucoes/textos';
import { cn } from '@/lib/utils';

interface Props {
  evolucao: Evolucao;
  ocupado: boolean;
  erro: string | null;
  aoMudar: (situacao: 'concluida' | 'em_conferencia') => void;
  resumo: ResumoDaConferencia;
  pronta: boolean;
  /** Os alertas do PDF do Tita ainda sem ciência (E19). */
  alertasDoTita: number;
}

function IconeDoAndamento({ bloqueios, tudo }: Readonly<{ bloqueios: number; tudo: boolean }>) {
  if (bloqueios > 0) return <OctagonX aria-hidden="true" className="size-4" />;
  const Icone = tudo ? CircleCheck : Info;
  return <Icone aria-hidden="true" className="size-4" />;
}

/** O andamento em conferência (o `.bb-pend` do protótipo): leva ao bloqueio ou à parte a conferir. */
function Andamento({
  resumo,
  alertasDoTita,
}: Readonly<{ resumo: ResumoDaConferencia; alertasDoTita: number }>) {
  const bloqueios = resumo.comBloqueio.length;
  const tudo = resumo.conferidas === 4;
  const destino = resumo.comBloqueio[0] ?? resumo.aConferir;
  return (
    <button
      type="button"
      onClick={() => {
        if (destino !== null) irParaParte(destino);
      }}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-[0.8125rem] font-extrabold foco-anel',
        bloqueios > 0 && 'text-bloq-text',
        bloqueios === 0 && tudo && 'text-ok-text',
        bloqueios === 0 && !tudo && 'text-apagado',
      )}
    >
      <IconeDoAndamento bloqueios={bloqueios} tudo={tudo} />
      {resumo.conferidas} de 4 partes conferidas
      {bloqueios > 0 && ` · ${plural(bloqueios, 'parte com bloqueio', 'partes com bloqueio')}`}
      {resumo.devolucao && ' · devolução a resolver'}
      {alertasDoTita > 0 &&
        ` · ${plural(alertasDoTita, 'alerta', 'alertas')} do PDF do Tita sem ciência`}
    </button>
  );
}

/** À esquerda da barra: o andamento, quem confere, a conclusão ou o envio. */
function Regra({
  evolucao,
  resumo,
  alertasDoTita,
}: Readonly<Pick<Props, 'evolucao' | 'resumo' | 'alertasDoTita'>>) {
  if (evolucao.situacao === 'em_conferencia') {
    if (evolucao.editavel) return <Andamento resumo={resumo} alertasDoTita={alertasDoTita} />;
    return (
      <>
        <Pencil aria-hidden="true" className="size-4" />
        Em conferência por {evolucao.coordenador ?? 'a coordenação'}
      </>
    );
  }
  if (evolucao.situacao === 'concluida') {
    const quando =
      evolucao.concluidaEm === null ? '' : ` em ${formatarDataHora(evolucao.concluidaEm)}`;
    return (
      <>
        <CircleCheck aria-hidden="true" className="size-4 text-ok-ic" />
        Concluída{quando} · vai no arquivo do mês
      </>
    );
  }
  return (
    <>
      <Lock aria-hidden="true" className="size-4" />
      Enviada no arquivo do mês: só leitura
    </>
  );
}

/** O que falta para o botão de concluir habilitar. */
function oQueFalta(resumo: ResumoDaConferencia): string {
  return resumo.devolucao
    ? 'Marque a devolução como resolvida para concluir'
    : 'Confira as 4 partes, sem pendências, para concluir';
}

/**
 * A barra fixa da evolução (o `.bottombar` do protótipo): à esquerda, o andamento; à direita,
 * concluir ou reabrir. O erro da última ação aparece acima, em todas as larguras.
 */
export function BarraDaEvolucao(props: Readonly<Props>) {
  const { evolucao, ocupado, erro, aoMudar, resumo, pronta, alertasDoTita } = props;
  const concluir = evolucao.editavel && evolucao.situacao === 'em_conferencia';
  const reabrir = evolucao.editavel && evolucao.situacao === 'concluida';
  return (
    <BarraInferior
      alerta={erro}
      regra={<Regra evolucao={evolucao} resumo={resumo} alertasDoTita={alertasDoTita} />}
      acoes={
        <>
          {concluir && (
            <Button
              size="lg"
              onClick={() => {
                aoMudar('concluida');
              }}
              disabled={ocupado || !pronta}
              title={pronta ? undefined : oQueFalta(resumo)}
            >
              <CircleCheck aria-hidden="true" />
              Concluir evolução
            </Button>
          )}
          {reabrir && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                aoMudar('em_conferencia');
              }}
              disabled={ocupado}
            >
              <Undo2 aria-hidden="true" />
              Reabrir
            </Button>
          )}
        </>
      }
    />
  );
}
