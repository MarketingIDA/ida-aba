import { CalendarDays, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';

import { MENU_DO_PAPEL, rotaInicial } from '@/app/navegacao';
import quadrados from '@/assets/marca/squares.png';
import { type Papel, ROTULO_DO_PAPEL, useAcoesDeAuth, useUsuario } from '@/hooks/useUsuario';
import { cn } from '@/lib/utils';
import { iniciais } from '@/utils/iniciais';
import {
  formatarData,
  hojeNaClinica,
  mesDaEvolucao,
  nomeDoMes,
  periodoAnalisado,
  prazoDoArquivo,
} from '@dominio/mes.ts';

/**
 * Sobre o azul do menu e da barra do topo, o foco é um contorno branco. Texto branco nunca fica
 * sobre azul clareado (branco translúcido por cima dá 3,97:1): card e hover escurecem com o
 * azul-escuro da marca.
 */
export const focoNoAzul =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const pressionar =
  'transition-[background-color,color,transform,box-shadow] duration-150 motion-reduce:transition-none';

function CartaoDoUsuario() {
  const usuario = useUsuario();
  const { logout } = useAcoesDeAuth();
  if (usuario === null) return null;

  return (
    <div className="flex items-center gap-2 rounded-[18px] bg-marinho/22 py-2.5 pr-2.5 pl-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white font-display text-sm font-bold text-azul ring-2 ring-white/22"
      >
        {iniciais(usuario.nome)}
      </span>
      <p className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[0.84rem] font-bold">{usuario.nome}</span>
        <span className="truncate text-xs font-semibold">{ROTULO_DO_PAPEL[usuario.papel]}</span>
      </p>
      <button
        type="button"
        aria-label="Sair"
        onClick={() => void logout()}
        className={cn(
          'grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-[11px] bg-white/14 hover:bg-white/20 active:scale-[0.94]',
          pressionar,
          focoNoAzul,
        )}
      >
        <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
      </button>
    </div>
  );
}

/**
 * Card do mês da evolução: o mês aberto, as sessões que ele analisa (E18) e o prazo do arquivo do
 * mês (E15). Leva à primeira tela do papel (todo card leva à lista do que ele conta).
 */
function CartaoDoMes({
  papel,
  aoNavegar,
}: Readonly<{ papel: Papel; aoNavegar?: (() => void) | undefined }>) {
  const mes = mesDaEvolucao(hojeNaClinica(new Date()));
  const { inicio, fim } = periodoAnalisado(mes);
  const nome = nomeDoMes(mes);

  return (
    <Link
      to={rotaInicial(papel)}
      onClick={aoNavegar}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border border-white/16 bg-azul-escuro/55 px-4 py-3.5 hover:bg-azul-escuro active:scale-[0.98]',
        pressionar,
        focoNoAzul,
      )}
    >
      <span className="flex items-center gap-1.5 rotulo">
        <CalendarDays aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        Evolução do mês
      </span>{' '}
      <span className="font-display text-xl leading-tight font-bold">
        {nome.charAt(0).toUpperCase() + nome.slice(1)} <span className="opacity-70">/</span>{' '}
        {mes.slice(0, 4)}
      </span>{' '}
      <span className="text-xs font-semibold">
        Sessões de {formatarData(inicio, true)} a {formatarData(fim, true)}
      </span>{' '}
      <span className="-mt-1 text-xs font-semibold">
        Arquivo do mês até {formatarData(prazoDoArquivo(mes), true)}
      </span>
    </Link>
  );
}

function NavegacaoPrincipal({
  papel,
  aoNavegar,
}: Readonly<{ papel: Papel; aoNavegar?: (() => void) | undefined }>) {
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-0.5">
        {MENU_DO_PAPEL[papel].map(({ rota, rotulo, icone: Icone }) => (
          <li key={rota}>
            <NavLink
              to={rota}
              onClick={aoNavegar}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-[14px] pr-2.5 pl-3 text-sm active:scale-[0.98] [@media(max-height:760px)]:h-[38px]',
                  isActive
                    ? 'bg-white font-bold text-azul shadow-[0_6px_14px_-10px_rgb(14_42_71/0.45)]'
                    : 'font-semibold hover:bg-azul-escuro',
                  pressionar,
                  focoNoAzul,
                )
              }
            >
              <Icone aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.6} />
              <span className="min-w-0 flex-1 truncate">{rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Conteúdo do menu lateral, o mesmo no menu fixo e na gaveta: nome do app, mês da evolução,
 * navegação do papel e, no rodapé, os quadrados e o usuário.
 */
export function MenuLateral({
  aoNavegar,
  botaoFechar,
}: Readonly<{ aoNavegar?: () => void; botaoFechar?: ReactNode }>) {
  const usuario = useUsuario();

  return (
    <div className="relative z-[1] flex h-full [scrollbar-width:none] flex-col gap-3.5 overflow-y-auto px-3.5 pt-[22px] pb-4 [@media(max-height:760px)]:gap-2.5 [@media(max-height:760px)]:pt-4">
      <div className="flex min-h-9 items-center justify-between px-1">
        <p className="font-display text-[1.03rem] font-bold">Evolução ABA</p>
        {botaoFechar}
      </div>
      {usuario !== null && (
        <>
          <CartaoDoMes papel={usuario.papel} aoNavegar={aoNavegar} />
          <NavegacaoPrincipal papel={usuario.papel} aoNavegar={aoNavegar} />
        </>
      )}
      <div className="mt-auto flex flex-col gap-3">
        <img src={quadrados} alt="" className="ml-1.5 h-3.5 w-auto self-start opacity-95" />
        <CartaoDoUsuario />
      </div>
    </div>
  );
}
