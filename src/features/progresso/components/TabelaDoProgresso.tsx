import type { ReactNode } from 'react';

import { SITUACAO_DA_META } from '@/features/cadastros/metas';
import { mesDoPeriodo, nomeDoNivel, numero } from '@/features/progresso/textos';
import { plural } from '@/utils/textos';
import { formatarData } from '@dominio/mes.ts';
import type { MedianaDaCarteira } from '@dominio/mediana.ts';
import type { AnaliseDaMeta, PontoDoProgresso, Progresso } from '@dominio/progresso.ts';

const TH = 'px-3 py-2 text-left text-caption font-bold text-apagado';
const TD = 'px-3 py-2 align-top text-sm text-texto';

const nivelEData = (p: PontoDoProgresso | null) =>
  p === null ? '—' : `${nomeDoNivel(p.nivel)} (${formatarData(p.data, true)})`;

function atencao(x: AnaliseDaMeta, ultimoMes: string): string {
  if (x.parada > 0) return `Mesmo degrau há ${plural(x.parada, 'semana', 'semanas')}`;
  if (x.sumiu) return `Sem registro em ${ultimoMes}`;
  return '—';
}

function independenteEm(x: AnaliseDaMeta): string {
  if (x.independente === null) return '—';
  const sessoes = plural(x.sessoesAteIndependente ?? 0, 'sessão', 'sessões');
  return `${formatarData(x.independente.data, true)} · ${sessoes}`;
}

function Tabela({
  titulo,
  cabecalho,
  children,
}: Readonly<{ titulo: string; cabecalho: string[]; children: ReactNode }>) {
  return (
    <section className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm">
      <h2 className="px-4 pt-4 pb-2 text-base">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{titulo}</caption>
          <thead className="border-b border-borda">
            <tr>
              {cabecalho.map((c) => (
                <th key={c} scope="col" className={TH}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

const COLUNAS_DAS_METAS = [
  'Meta',
  'Situação',
  'Sessões',
  'Sem nível',
  'Primeiro nível',
  'Nível agora',
  'Independente em',
  'Atenção',
];

function TabelaDasMetas({
  metas,
  ultimoMes,
}: Readonly<{ metas: readonly AnaliseDaMeta[]; ultimoMes: string }>) {
  return (
    <Tabela titulo="Metas" cabecalho={COLUNAS_DAS_METAS}>
      {metas.map((x) => (
        <tr key={x.meta.id}>
          <td className={TD}>
            <b className="text-marinho">{x.meta.programa ?? 'sem programa'}</b>
            <span className="block text-caption text-texto-2">{x.meta.texto}</span>
          </td>
          <td className={TD}>{SITUACAO_DA_META[x.meta.situacao].rotulo}</td>
          <td className={TD}>{x.pontos.length}</td>
          <td className={TD}>{x.semNivel}</td>
          <td className={TD}>{nivelEData(x.primeiro)}</td>
          <td className={TD}>{nivelEData(x.ultimo)}</td>
          <td className={TD}>{independenteEm(x)}</td>
          <td className={TD}>{atencao(x, ultimoMes)}</td>
        </tr>
      ))}
    </Tabela>
  );
}

interface PropsPorSemana {
  nome: string;
  progresso: Progresso;
  mediana: MedianaDaCarteira | null;
}

function TabelaPorSemana({ nome, progresso, mediana }: Readonly<PropsPorSemana>) {
  const cabecalho = ['Semana de', nome];
  if (mediana !== null) cabecalho.push('Mediana da carteira');
  return (
    <Tabela titulo="Metas que chegaram à independência, por semana" cabecalho={cabecalho}>
      {progresso.semanas.map((s, w) => (
        <tr key={s}>
          <td className={TD}>{formatarData(s, true)}</td>
          <td className={TD}>{progresso.porSemana[w]}</td>
          {mediana !== null && <td className={TD}>{numero(mediana.porSemana[w] ?? 0)}</td>}
        </tr>
      ))}
    </Tabela>
  );
}

function TabelaDasSessoes({ metas }: Readonly<{ metas: readonly AnaliseDaMeta[] }>) {
  const pontos = metas
    .flatMap((x) => x.pontos.map((p) => ({ x, p })))
    .sort((a, b) => (a.p.data < b.p.data ? -1 : 1));
  return (
    <Tabela
      titulo="Cada sessão, com a frase da análise"
      cabecalho={['Dia', 'Meta', 'Nível', 'Frase da análise']}
    >
      {pontos.map(({ x, p }) => (
        <tr key={`${String(x.meta.id)}-${p.data}`}>
          <td className={TD}>{formatarData(p.data, true)}</td>
          <td className={TD}>{x.meta.programa ?? 'sem programa'}</td>
          <td className={TD}>{nomeDoNivel(p.nivel)}</td>
          <td className={TD}>{p.trecho}</td>
        </tr>
      ))}
    </Tabela>
  );
}

/** Os mesmos dados dos gráficos, em números, e cada ponto com a frase de onde saiu (E27). */
export function TabelaDoProgresso({
  nome,
  progresso,
  mediana,
  metas,
}: Readonly<PropsPorSemana & { metas: readonly AnaliseDaMeta[] }>) {
  return (
    <div className="flex flex-col gap-4">
      <TabelaDasMetas metas={metas} ultimoMes={mesDoPeriodo(progresso.fim)} />
      <TabelaPorSemana nome={nome} progresso={progresso} mediana={mediana} />
      <TabelaDasSessoes metas={metas} />
    </div>
  );
}
