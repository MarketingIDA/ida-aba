import { Link, useLocation } from 'react-router';

import { focoNoAzul, pressionar } from '@/app/layouts/estilosDoMenu';
import type { ResumoDoMenu } from '@/app/layouts/useResumoDoMenu';
import { type ItemDoMenu, MENU_DO_PAPEL } from '@/app/navegacao';
import { SITUACAO, SITUACOES, type Situacao } from '@/features/evolucoes/logica';
import type { Papel } from '@/hooks/useUsuario';
import { cn } from '@/lib/utils';

interface Props {
  papel: Papel;
  resumo: ResumoDoMenu;
  aoNavegar?: (() => void) | undefined;
}

/** A bolinha de cada situação no menu: neutro, amarelo, branco (azul quando marcado) e verde. */
const PONTO: Record<Situacao, string> = {
  sem: 'bg-[#9fb4d1]',
  em_conferencia: 'bg-amarelo',
  concluida: 'bg-white group-aria-[current=page]:bg-azul',
  enviada: 'bg-verde',
};

const classeDoItem = (marcado: boolean, sub = false) =>
  cn(
    'group flex items-center rounded-[14px] active:scale-[0.98]',
    sub
      ? 'h-9 gap-2 pr-2 pl-[9px] text-[0.84rem] font-bold [@media(max-height:760px)]:h-8'
      : 'h-[42px] gap-3 pr-2.5 pl-3 text-[0.9rem] font-extrabold [@media(max-height:760px)]:h-[38px]',
    marcado
      ? 'bg-white text-azul shadow-[0_8px_18px_-10px_rgb(14_42_71/0.55)]'
      : 'hover:bg-azul-escuro',
    pressionar,
    focoNoAzul,
  );

/** O número ao lado do item. Fica fora do nome do link: o leitor de tela já ouve o total na tela. */
function Contador({ valor }: Readonly<{ valor: number | null }>) {
  if (valor === null) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-grid h-[22px] min-w-6 place-items-center rounded-full bg-azul-escuro/70 px-[7px] text-xs font-extrabold group-aria-[current=page]:bg-info-soft group-aria-[current=page]:text-azul"
    >
      {valor}
    </span>
  );
}

function contadorDe(item: ItemDoMenu, resumo: ResumoDoMenu): number | null {
  if (item.contador === 'arquivos') return resumo.arquivosEnviados;
  if (item.contador === 'assistidos' && resumo.porSituacao !== null) {
    return Object.values(resumo.porSituacao).reduce((soma, n) => soma + n, 0);
  }
  return null;
}

function Situacoes({
  resumo,
  situacao,
  aoNavegar,
}: Readonly<Omit<Props, 'papel'> & { situacao: string | null }>) {
  return (
    <ul className="mt-0.5 mb-1 ml-[18px] flex flex-col gap-0.5 border-l-[1.5px] border-white/22 pl-[5px]">
      {SITUACOES.map((chave) => (
        <li key={chave}>
          <Link
            to={`/evolucoes?situacao=${chave}`}
            onClick={aoNavegar}
            aria-current={situacao === chave ? 'page' : undefined}
            className={classeDoItem(situacao === chave, true)}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-[9px] shrink-0 rounded-full ring-2 ring-white/18 group-aria-[current=page]:ring-info-soft',
                PONTO[chave],
              )}
            />
            <span className="min-w-0 flex-1 truncate">{SITUACAO[chave].rotulo}</span>
            <Contador valor={resumo.porSituacao?.[chave] ?? null} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * O menu do papel, como no protótipo: contadores, as situações abaixo de Evoluções e os títulos de
 * seção. Um subitem marcado tira a marca de Evoluções (a URL diz qual situação está aberta).
 */
export function NavegacaoPrincipal({ papel, resumo, aoNavegar }: Readonly<Props>) {
  const { pathname, search } = useLocation();
  const situacao = pathname === '/evolucoes' ? new URLSearchParams(search).get('situacao') : null;

  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-0.5">
        {MENU_DO_PAPEL[papel].map((item) => {
          const Icone = item.icone;
          const naRota = pathname === item.rota || pathname.startsWith(`${item.rota}/`);
          const marcado = naRota && !(item.situacoes === true && situacao !== null);
          return (
            <li key={item.rota}>
              {item.secao !== undefined && (
                <p className="px-3 pt-2.5 pb-1.5 rotulo">{item.secao}</p>
              )}
              <Link
                to={item.rota}
                onClick={aoNavegar}
                aria-current={marcado ? 'page' : undefined}
                className={classeDoItem(marcado)}
              >
                <Icone aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                <Contador valor={contadorDe(item, resumo)} />
              </Link>
              {item.situacoes === true && (
                <Situacoes resumo={resumo} situacao={situacao} aoNavegar={aoNavegar} />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
