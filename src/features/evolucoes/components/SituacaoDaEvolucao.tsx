import { ChevronRight, CircleCheck, OctagonX, Pencil, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { plural } from '@/features/evolucoes/logica';
import { irParaParte, type ResumoDaConferencia } from '@/features/evolucoes/resumo';
import { formatarDataHora } from '@/features/evolucoes/textos';
import { useUsuario } from '@/hooks/useUsuario';
import { cn } from '@/lib/utils';

const CAIXA =
  'flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-left no-underline foco-anel';
const TOM = {
  ok: 'border-ok-border bg-ok-soft text-ok-text',
  bloq: 'border-bloq-border bg-bloq-soft text-bloq-text',
  info: 'border-info-border bg-info-soft text-info-text',
} as const;

interface Caixa {
  tom: keyof typeof TOM;
  icone: ReactNode;
  titulo: string;
  texto: string;
}

function Conteudo({ caixa, comSeta }: Readonly<{ caixa: Caixa; comSeta: boolean }>) {
  return (
    <>
      <span aria-hidden="true" className="shrink-0 [&_svg]:size-[22px]">
        {caixa.icone}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="font-display text-[1.0625rem] leading-tight">{caixa.titulo}</b>
        <span className="text-[0.8125rem] font-bold">{caixa.texto}</span>
      </span>
      {comSeta && <ChevronRight aria-hidden="true" className="ml-auto size-[18px] shrink-0" />}
    </>
  );
}

const alertas = (n: number) => (n === 0 ? '' : plural(n, 'alerta', 'alertas'));

/** A caixa da evolução em conferência: bloqueio, o que falta conferir ou pronta. */
function caixaEmConferencia(resumo: ResumoDaConferencia): Caixa {
  const bloqueios = resumo.comBloqueio.length + (resumo.devolucao ? 1 : 0);
  const andamento = `${String(resumo.conferidas)} de 4 partes conferidas`;
  if (bloqueios > 0) {
    const partes = [
      resumo.comBloqueio.length > 0 &&
        plural(resumo.comBloqueio.length, 'parte com bloqueio', 'partes com bloqueio'),
      resumo.devolucao && 'devolução a resolver',
      alertas(resumo.alertas),
    ].filter(Boolean);
    return {
      tom: 'bloq',
      icone: <OctagonX />,
      titulo: 'Há bloqueio que impede concluir',
      texto: `${andamento} · ${partes.join(' · ')}. Toque para ir ao bloqueio.`,
    };
  }
  if (resumo.aConferir !== null) {
    const faltam = 4 - resumo.conferidas;
    const paraLer = resumo.alertas > 0 ? `${alertas(resumo.alertas)} para ler. ` : '';
    return {
      tom: 'info',
      icone: <Pencil />,
      titulo: `Sem bloqueios. Falta conferir ${plural(faltam, 'parte', 'partes')}`,
      texto: `${paraLer}Toque para ir à parte ${String(resumo.aConferir)}.`,
    };
  }
  const abertos =
    resumo.alertas > 0
      ? ` ${plural(resumo.alertas, 'alerta segue aberto', 'alertas seguem abertos')}.`
      : '';
  return {
    tom: 'ok',
    icone: <CircleCheck />,
    titulo: 'Pronta para concluir',
    texto: `As 4 partes conferidas e sem bloqueios.${abertos}`,
  };
}

interface Props {
  evolucao: Evolucao;
  resumo: ResumoDaConferencia;
  ocupado: boolean;
  aoConcluir: () => void;
}

/** Concluída ou enviada: a caixa leva ao arquivo do mês, de quem o vê. */
function NoArquivo({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const geral = useUsuario()?.papel === 'coordenacao_geral';
  const enviada = evolucao.situacao === 'enviada';
  const quando =
    evolucao.concluidaEm === null ? '' : `Concluída em ${formatarDataHora(evolucao.concluidaEm)}. `;
  const caixa: Caixa = enviada
    ? {
        tom: 'ok',
        icone: <Send />,
        titulo: 'Enviada no arquivo do mês',
        texto: 'Só leitura. Toque para ver o arquivo.',
      }
    : {
        tom: 'info',
        icone: <CircleCheck />,
        titulo: 'Concluída, no arquivo do mês',
        texto: `${quando}${geral ? 'Você pode devolver com motivo antes do envio do arquivo.' : 'Vai a contas médicas com o arquivo do mês.'} Toque para ver o arquivo.`,
      };
  return (
    <Link
      to={`${geral ? '/arquivos' : '/arquivo'}?mes=${evolucao.mesRef}`}
      className={cn(CAIXA, TOM[caixa.tom])}
    >
      <Conteudo caixa={caixa} comSeta />
    </Link>
  );
}

/**
 * A caixa de situação do protótipo, abaixo do cabeçalho: diz o que impede concluir, o que falta
 * conferir ou que está pronta, e leva até lá. "Pronta" conclui, com a mesma regra da barra.
 */
export function SituacaoDaEvolucao({ evolucao, resumo, ocupado, aoConcluir }: Readonly<Props>) {
  if (evolucao.situacao !== 'em_conferencia') return <NoArquivo evolucao={evolucao} />;
  const caixa = caixaEmConferencia(resumo);
  const destino = resumo.comBloqueio[0] ?? resumo.aConferir;
  const conclui = caixa.tom === 'ok' && evolucao.editavel;
  if (caixa.tom === 'ok' && !conclui) {
    return (
      <div className={cn(CAIXA, TOM.ok)}>
        <Conteudo caixa={caixa} comSeta={false} />
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={conclui && ocupado}
      onClick={() => {
        if (conclui) aoConcluir();
        else if (destino !== null) irParaParte(destino);
      }}
      className={cn(CAIXA, 'cursor-pointer disabled:cursor-wait', TOM[caixa.tom])}
    >
      <Conteudo caixa={caixa} comSeta />
    </button>
  );
}
