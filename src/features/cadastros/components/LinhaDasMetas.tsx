import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import type { Assistido } from '@/features/cadastros/api/assistidos.api';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { contarMetas } from '@/features/cadastros/metas';
import { carteirasOptions, unidadesOptions } from '@/features/cadastros/queries';
import { iniciais } from '@/utils/iniciais';
import { plural } from '@/utils/textos';
import { ROTULO_DO_TURNO } from '@/utils/turno';

/** "BOV · Tarde" de cada carteira; enquanto as listas não chegam, a linha fica sem o local. */
export function useLocalDasCarteiras(): ReadonlyMap<number, string> {
  const carteiras = useQuery(carteirasOptions());
  const unidades = useQuery(unidadesOptions());
  const sigla = new Map((unidades.data ?? []).map((u) => [u.id, u.sigla]));
  return new Map(
    (carteiras.data ?? []).map((c) => [
      c.id,
      `${sigla.get(c.unidadeId) ?? '?'} · ${ROTULO_DO_TURNO[c.turno]}`,
    ]),
  );
}

const COLUNA = 'hidden truncate text-[0.8125rem] font-bold text-apagado min-[861px]:block';

/** Uma linha do `.row.r-metas` do protótipo: avatar, nome e local, as contagens e a seta. */
export function LinhaDasMetas({
  assistido,
  metas,
  local,
}: Readonly<{ assistido: Assistido; metas: readonly Meta[]; local: string | undefined }>) {
  const n = contarMetas(metas);
  const alcancadas = n.alcancada + n.manutencao;
  return (
    <li className="relative grid grid-cols-[36px_minmax(0,1fr)_auto_20px] items-center gap-3.5 border-b border-borda bg-superficie px-4 py-[13px] transition-colors duration-150 last:border-b-0 hover:bg-superficie-2 min-[861px]:grid-cols-[36px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_auto_20px] min-[861px]:px-[22px]">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-info-soft text-[0.78rem] font-extrabold text-azul-escuro"
      >
        {iniciais(assistido.nome)}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="block truncate text-[0.90625rem] leading-tight font-extrabold text-marinho">
          {/* A linha toda é o alvo do toque: o ::after do link cobre o `li`. */}
          <Link
            to={`/metas/${String(assistido.id)}`}
            className="rounded-sm foco-anel after:absolute after:inset-0 after:content-['']"
          >
            {assistido.nome}
          </Link>
        </b>
        <span className="truncate text-[0.78rem] font-semibold text-apagado">
          {[local, metas.length === 0 && 'sem metas cadastradas'].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className={COLUNA}>{n.desenvolvimento} em desenvolvimento</span>
      <span className={COLUNA}>
        {alcancadas} alcançadas{n.manutencao > 0 && `, ${String(n.manutencao)} em manutenção`}
      </span>
      <span>
        {n.suspensa > 0 && (
          <span className="rounded-full bg-neutro-suave px-2 py-px text-[0.72rem] font-extrabold whitespace-nowrap text-texto-2">
            {plural(n.suspensa, 'suspensa', 'suspensas')}
          </span>
        )}
      </span>
      <ChevronRight aria-hidden="true" className="size-[18px] text-tenue" />
    </li>
  );
}
