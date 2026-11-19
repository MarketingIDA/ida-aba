import { AlertTriangle, ChartLine, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  GraficoDeIndependencia,
  type PropsDoGrafico,
} from '@/features/progresso/components/GraficoDeIndependencia';
import {
  chegaram,
  comparacaoComMediana,
  mesDoPeriodo,
  nomeDoNivel,
} from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';
import type { AnaliseDaMeta } from '@dominio/progresso.ts';

/** Um destaque: leva até o card da meta. */
function Destaque({
  icone,
  titulo,
  texto,
  meta,
  alerta,
}: Readonly<{
  icone: ReactNode;
  titulo: string;
  texto: string;
  meta: AnaliseDaMeta;
  alerta: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={() => {
        const card = document.getElementById(`meta-${String(meta.meta.id)}`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card?.focus({ preventScroll: true });
      }}
      className="flex w-full items-center gap-2.5 rounded-[14px] border border-white/14 bg-white/6 px-3 py-[9px] text-left text-[0.8125rem] leading-[1.35] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/13 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.985]"
    >
      <span
        className={`grid size-8 flex-none place-items-center rounded-[10px] ${alerta ? 'bg-amarelo text-marinho' : 'bg-[#5ca8ff]/28'}`}
      >
        {icone}
      </span>
      <span>
        <b className="block text-[10.5px] font-extrabold tracking-[0.09em] text-[#9cc8ff] uppercase">
          {titulo}
        </b>
        {texto}
      </span>
      <ChevronRight aria-hidden="true" className="ml-auto size-4 flex-none opacity-60" />
    </button>
  );
}

const programa = (x: AnaliseDaMeta) => x.meta.programa ?? 'Meta';
const ICONE = 'size-4';

/** Os destaques: a meta mais rápida, a parada há mais tempo e a que sumiu no último mês. */
function Destaques({ progresso, periodos }: Readonly<PropsDoGrafico>) {
  const { rapida, parada, sumiu } = progresso.destaques;
  const ultimo = periodos.at(-1);
  return (
    <div className="flex flex-col gap-2">
      {rapida !== null && (
        <Destaque
          icone={<TrendingUp aria-hidden="true" className={ICONE} />}
          alerta={false}
          meta={rapida}
          titulo="Mais rápida"
          texto={`${programa(rapida)}: independente em ${plural(rapida.sessoesAteIndependente ?? 0, 'sessão', 'sessões')}`}
        />
      )}
      {parada !== null && (
        <Destaque
          icone={<AlertTriangle aria-hidden="true" className={ICONE} />}
          alerta
          meta={parada}
          titulo="No mesmo degrau"
          texto={`${programa(parada)}: ${nomeDoNivel(parada.ultimo?.nivel ?? null).toLowerCase()} há ${plural(parada.parada, 'semana', 'semanas')}`}
        />
      )}
      {sumiu !== null && ultimo !== undefined && (
        <Destaque
          icone={<AlertTriangle aria-hidden="true" className={ICONE} />}
          alerta
          meta={sumiu}
          titulo={`Sem registro em ${mesDoPeriodo(ultimo.inicio)}`}
          texto={`${programa(sumiu)} não aparece nas análises`}
        />
      )}
    </div>
  );
}

/** Acima, abaixo ou na mediana da carteira, no fim da janela. */
function Comparacao({ progresso, mediana }: Readonly<PropsDoGrafico>) {
  const comparacao = comparacaoComMediana(progresso.independentes, mediana);
  if (comparacao === null) return null;
  const Seta = comparacao.subiu ? TrendingUp : TrendingDown;
  return (
    <p className="mt-3.5 inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/10 py-1.5 pr-3.5 pl-2.5 text-[0.84rem] font-extrabold text-white">
      <Seta aria-hidden="true" className="size-[15px]" />
      {comparacao.texto}
    </p>
  );
}

/** A legenda das duas linhas: o assistido em azul claro, a carteira em cinza. */
function Legenda({ nome, mediana }: Readonly<PropsDoGrafico>) {
  if (mediana === null) return null;
  const item = 'inline-flex items-center gap-1.5';
  return (
    <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs font-bold text-[#c9d8ea]">
      <span className={item}>
        <i aria-hidden="true" className="inline-block h-[3px] w-4 rounded-full bg-[#5ca8ff]" />
        {nome}
      </span>
      <span className={item}>
        <i aria-hidden="true" className="inline-block h-[2px] w-4 rounded-full bg-[#6a7891]" />
        Mediana da carteira · {plural(mediana.assistidos, 'assistido', 'assistidos')}
      </span>
    </p>
  );
}

/** O fundo do `.pg-hero`: dois brilhos azuis sobre o marinho e a grade apagada. */
const FUNDO =
  'bg-[radial-gradient(90%_120%_at_100%_0%,rgb(0_108_255/.62)_0%,rgb(0_108_255/0)_58%),radial-gradient(70%_90%_at_0%_110%,rgb(0_108_255/.34)_0%,rgb(0_108_255/0)_60%),linear-gradient(150deg,#173f6b_0%,var(--ida-marinho)_46%,#06162a_100%)]';
const GRADE =
  "before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(rgb(255_255_255/.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/.05)_1px,transparent_1px)] before:bg-size-[28px_28px] before:[mask-image:radial-gradient(75%_85%_at_72%_30%,#000,transparent)] before:content-['']";

/** O topo da tela: quantas metas chegaram à independência, os destaques e o gráfico. */
export function HeroDoProgresso(props: Readonly<PropsDoGrafico>) {
  const { nome, progresso } = props;
  return (
    <section
      className={`relative isolate grid items-center gap-5 overflow-hidden rounded-[22px] px-[18px] py-[22px] text-white shadow-[0_26px_50px_-26px_rgb(14_42_71/.7)] min-[561px]:rounded-[28px] min-[561px]:px-[30px] min-[561px]:py-7 min-[1101px]:grid-cols-[minmax(0,.92fr)_minmax(0,1.25fr)] min-[1101px]:gap-7 ${FUNDO} ${GRADE}`}
    >
      <div className="flex flex-col">
        <p className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-[0.1em] text-[#9cc8ff] uppercase">
          <ChartLine aria-hidden="true" className="size-3.5" />
          Evolução das metas
        </p>
        <h1 className="mt-1 text-2xl text-white">{nome}</h1>
        <p className="mt-4 mb-0.5 flex items-end gap-3.5">
          <b className="bg-[linear-gradient(180deg,#fff_35%,#8ec2ff_100%)] bg-clip-text pt-1.5 font-display text-[80px] leading-[.8] font-extrabold tracking-[-0.03em] text-transparent min-[561px]:text-[104px]">
            {progresso.independentes}
          </b>
          <span className="pb-1 font-display text-lg leading-[1.15] font-bold min-[561px]:text-[21px] min-[1101px]:max-w-[15ch]">
            de {plural(progresso.ativas, 'meta', 'metas')} {chegaram(progresso.independentes)} à
            independência
          </span>
        </p>
        <Comparacao {...props} />
        <p className="mt-3 max-w-[50ch] text-[0.8125rem] leading-normal font-semibold text-[#b9cce4]">
          Nível de apoio lido pela IA em {plural(progresso.dias, 'dia de sessão', 'dias de sessão')}
          , de {formatarData(progresso.inicio)} a {formatarData(progresso.fim)}. O Tita não traz
          número: cada ponto vem de uma frase da análise.
        </p>
        <div className="mt-[18px]">
          <Destaques {...props} />
        </div>
      </div>
      <figure className="m-0 min-w-0">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3.5 gap-y-2">
          <figcaption className="font-display text-base font-extrabold text-white">
            Metas independentes, semana a semana
          </figcaption>
          <Legenda {...props} />
        </div>
        <GraficoDeIndependencia {...props} />
      </figure>
    </section>
  );
}
