import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { CartaoDoMes } from '@/app/layouts/CartaoDoMes';
import { CartaoDoUsuario } from '@/app/layouts/CartaoDoUsuario';
import { focoNoAzul } from '@/app/layouts/estilosDoMenu';
import { NavegacaoPrincipal } from '@/app/layouts/NavegacaoPrincipal';
import { useResumoDoMenu } from '@/app/layouts/useResumoDoMenu';
import { rotaInicial } from '@/app/navegacao';
import logo from '@/assets/marca/logo-instituto-autismo.png';
import quadrados from '@/assets/marca/squares.png';
import { type Papel, useUsuario } from '@/hooks/useUsuario';
import { cn } from '@/lib/utils';
import { hojeNaClinica, mesDaEvolucao } from '@dominio/mes.ts';

/** O logo do Instituto na pílula branca com a borda 3D azul-clara. */
export function LogoDoInstituto({ pequeno = false }: Readonly<{ pequeno?: boolean }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center bg-white',
        pequeno
          ? 'rounded-xl px-[9px] py-[5px] shadow-[0_2px_0_var(--ida-azul-3d)]'
          : 'rounded-[14px] px-[11px] py-[7px] shadow-[0_3px_0_var(--ida-azul-3d)]',
      )}
    >
      <img
        src={logo}
        alt="Instituto do Autismo"
        className={cn('block w-auto', pequeno ? 'h-[26px]' : 'h-[30px]')}
      />
    </span>
  );
}

/** O botão branco do coordenador: abre a escolha do assistido na tela das evoluções (E01). */
function NovaEvolucaoNoMenu({ aoNavegar }: Readonly<{ aoNavegar?: (() => void) | undefined }>) {
  return (
    <Link
      to="/evolucoes?nova=1"
      onClick={aoNavegar}
      className={cn(
        'flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-white font-display text-[0.97rem] font-extrabold text-azul shadow-[0_4px_0_var(--ida-azul-3d),0_10px_22px_-10px_rgb(14_42_71/0.55)] transition-[transform,box-shadow] duration-150 active:translate-y-[3px] active:shadow-[0_1px_0_var(--ida-azul-3d),0_6px_14px_-10px_rgb(14_42_71/0.55)] motion-reduce:transition-none',
        focoNoAzul,
      )}
    >
      <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.2} />
      Nova evolução mensal
    </Link>
  );
}

function MesENavegacao({
  papel,
  aoNavegar,
}: Readonly<{ papel: Papel; aoNavegar?: (() => void) | undefined }>) {
  const mes = mesDaEvolucao(hojeNaClinica(new Date()));
  const resumo = useResumoDoMenu(papel, mes);
  return (
    <>
      <CartaoDoMes
        mes={mes}
        destino={rotaInicial(papel)}
        andamento={resumo.andamento}
        aoNavegar={aoNavegar}
      />
      {papel === 'coordenador' && <NovaEvolucaoNoMenu aoNavegar={aoNavegar} />}
      <NavegacaoPrincipal papel={papel} resumo={resumo} aoNavegar={aoNavegar} />
    </>
  );
}

/**
 * Conteúdo do menu lateral, o mesmo no menu fixo e na gaveta, como no protótipo: o logo, o nome do
 * app, o mês da evolução, o botão de nova evolução, a navegação do papel e, no rodapé, os
 * quadrados e o usuário.
 */
export function MenuLateral({
  aoNavegar,
  botaoFechar,
}: Readonly<{ aoNavegar?: () => void; botaoFechar?: ReactNode }>) {
  const usuario = useUsuario();

  return (
    <div className="relative z-[1] flex h-full [scrollbar-width:none] flex-col gap-3.5 overflow-y-auto px-3.5 pt-[22px] pb-4 [@media(max-height:760px)]:gap-2.5 [@media(max-height:760px)]:pt-4">
      <div className="flex items-center justify-between px-1">
        <Link
          to={usuario === null ? '/' : rotaInicial(usuario.papel)}
          onClick={aoNavegar}
          aria-label="Início"
          className={cn('rounded-[14px]', focoNoAzul)}
        >
          <LogoDoInstituto />
        </Link>
        {botaoFechar}
      </div>
      <p className="-mt-0.5 px-1 font-display text-[1.03rem] font-bold">Evolução ABA</p>
      {usuario !== null && <MesENavegacao papel={usuario.papel} aoNavegar={aoNavegar} />}
      <div className="mt-auto flex flex-col gap-3">
        <img src={quadrados} alt="" className="ml-1.5 h-3.5 w-auto self-start opacity-95" />
        <CartaoDoUsuario />
      </div>
    </div>
  );
}
