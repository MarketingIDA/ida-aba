import { CalendarDays, FileText, TriangleAlert } from 'lucide-react';

import type { FonteDaFrase } from '@/features/evolucoes/api/fontes.api';
import { formatarDataHora } from '@/features/evolucoes/textos';
import { TIPOS_DE_DOCUMENTO } from '@dominio/documentos.ts';
import { formatarData } from '@dominio/mes.ts';

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold';

function Origens({ fonte }: Readonly<{ fonte: FonteDaFrase }>) {
  if (fonte.datas.length === 0 && fonte.documentos.length === 0) {
    return (
      <span className={`${CHIP} bg-alerta-soft text-alerta-text`}>
        <TriangleAlert aria-hidden="true" className="size-3" />
        sem fonte indicada
      </span>
    );
  }
  return (
    <>
      {fonte.datas.map((data) => (
        <span key={data} className={`${CHIP} bg-info-soft text-azul-escuro`}>
          <CalendarDays aria-hidden="true" className="size-3" />
          sessão de {formatarData(data, true)}
        </span>
      ))}
      {fonte.documentos.map((d) => (
        <span key={d.id} className={`${CHIP} bg-neutro-suave text-texto-2`} title={d.arquivo}>
          <FileText aria-hidden="true" className="size-3" />
          {TIPOS_DE_DOCUMENTO[d.tipo]}
          {d.data === null ? '' : `, ${formatarData(d.data)}`}
        </span>
      ))}
    </>
  );
}

/**
 * As fontes da parte (E06, E25): cada frase ou meta do rascunho da IA, com as sessões e os
 * documentos de onde saiu. Fechadas por padrão; se o texto mudou depois da IA, a nota avisa.
 */
export function FontesDaParte({ fontes }: Readonly<{ fontes: readonly FonteDaFrase[] }>) {
  const primeira = fontes[0];
  if (primeira === undefined) return null;
  return (
    <details className="rounded-lg border border-borda px-3 py-2 text-caption">
      <summary className="cursor-pointer font-bold text-azul foco-anel">
        Fontes do rascunho da IA ({fontes.length})
      </summary>
      {!primeira.versaoAtual && (
        <p className="mt-2 font-semibold text-alerta-text">
          O texto mudou depois do rascunho da IA de {formatarDataHora(primeira.criadoEm)}; as fontes
          são as daquele rascunho.
        </p>
      )}
      <ol className="mt-2 flex flex-col gap-2">
        {fontes.map((fonte) => (
          <li key={`${fonte.campo}-${String(fonte.ordem)}`} className="flex flex-col gap-1">
            <span className="font-semibold text-texto">{fonte.frase}</span>
            <span className="flex flex-wrap gap-1">
              <Origens fonte={fonte} />
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
