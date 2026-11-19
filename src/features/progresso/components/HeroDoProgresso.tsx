import { AlertTriangle, ChartLine, ChevronRight, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  GraficoDeIndependencia,
  type PropsDoGrafico,
} from '@/features/progresso/components/GraficoDeIndependencia';
import { mesDoPeriodo, nomeDoNivel } from '@/features/progresso/textos';
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
      className="flex w-full items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
    >
      <span
        className={`grid size-8 flex-none place-items-center rounded-lg ${alerta ? 'bg-amarelo text-marinho' : 'bg-[#5ca8ff]/30'}`}
      >
        {icone}
      </span>
      <span>
        <b className="block text-[10.5px] font-extrabold tracking-widest text-[#9cc8ff] uppercase">
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

/** O topo da tela: quantas metas chegaram à independência, os destaques e o gráfico. */
export function HeroDoProgresso(props: Readonly<PropsDoGrafico>) {
  const { nome, progresso } = props;
  const chegou = progresso.independentes === 1 ? 'já chegou' : 'já chegaram';
  return (
    <section className="grid gap-7 rounded-3xl bg-marinho p-6 text-white shadow-lg sm:p-7 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.25fr)] lg:items-center">
      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 rotulo text-[#9cc8ff]">
          <ChartLine aria-hidden="true" className="size-3.5" />
          Evolução das metas
        </p>
        <h1 className="text-white">{nome}</h1>
        <p className="flex items-end gap-3">
          <b className="font-display text-7xl leading-[.8] font-extrabold">
            {progresso.independentes}
          </b>
          <span className="max-w-[15ch] font-display text-xl leading-tight font-bold">
            de {plural(progresso.ativas, 'meta', 'metas')} {chegou} à independência
          </span>
        </p>
        <p className="max-w-[50ch] text-sm font-semibold text-[#b9cce4]">
          Nível de apoio lido pela IA em {plural(progresso.dias, 'dia de sessão', 'dias de sessão')}
          , de {formatarData(progresso.inicio)} a {formatarData(progresso.fim)}. O Tita não traz
          número: cada ponto vem de uma frase da análise.
        </p>
        <Destaques {...props} />
      </div>
      <figure className="m-0 min-w-0">
        <figcaption className="mb-2 text-base font-bold text-white">
          Metas independentes, semana a semana
        </figcaption>
        <GraficoDeIndependencia {...props} />
      </figure>
    </section>
  );
}
