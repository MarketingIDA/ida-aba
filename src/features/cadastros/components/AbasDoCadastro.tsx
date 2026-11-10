import { NavLink } from 'react-router';

import { cn } from '@/lib/utils';

export const ABAS = [
  { rota: '/cadastros/unidades', rotulo: 'Unidades' },
  { rota: '/cadastros/planos', rotulo: 'Planos de saúde' },
  { rota: '/cadastros/pessoas', rotulo: 'Pessoas' },
  { rota: '/cadastros/carteiras', rotulo: 'Carteiras' },
] as const;

/** As partes do cadastro, cada uma com o seu endereço (dá para voltar e mandar o link). */
export function AbasDoCadastro() {
  return (
    <nav aria-label="Cadastros">
      <ul className="flex flex-wrap gap-2">
        {ABAS.map(({ rota, rotulo }) => (
          <li key={rota}>
            <NavLink
              to={rota}
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-bold foco-anel transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none',
                  isActive
                    ? 'border-azul bg-info-soft text-azul-escuro'
                    : 'border-borda bg-superficie text-texto-2 hover:border-borda-forte hover:text-marinho',
                )
              }
            >
              {rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
