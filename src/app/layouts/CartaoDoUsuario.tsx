import { LogOut } from 'lucide-react';

import { focoNoAzul, pressionar } from '@/app/layouts/estilosDoMenu';
import { ROTULO_DO_PAPEL, useAcoesDeAuth, useUsuario } from '@/hooks/useUsuario';
import { cn } from '@/lib/utils';
import { iniciais } from '@/utils/iniciais';

/** Rodapé do menu: quem está no sistema, o papel e o botão de sair. */
export function CartaoDoUsuario() {
  const usuario = useUsuario();
  const { logout } = useAcoesDeAuth();
  if (usuario === null) return null;

  return (
    <div className="flex items-center gap-2 rounded-[18px] bg-marinho/28 py-2.5 pr-2.5 pl-3">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[0.78rem] font-extrabold text-azul ring-3 ring-white/25"
      >
        {iniciais(usuario.nome)}
      </span>
      <p className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-bold">{usuario.nome}</span>
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
        <LogOut aria-hidden="true" className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}
