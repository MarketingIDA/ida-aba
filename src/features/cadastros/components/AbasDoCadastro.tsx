import { NavLink } from 'react-router';

import { cn } from '@/lib/utils';

export const ABAS = [
  { rota: '/cadastros/unidades', rotulo: 'Unidades' },
  { rota: '/cadastros/planos', rotulo: 'Planos de saúde' },
  { rota: '/cadastros/pessoas', rotulo: 'Pessoas' },
  { rota: '/cadastros/carteiras', rotulo: 'Carteiras' },
  { rota: '/cadastros/assistidos', rotulo: 'Assistidos' },
  { rota: '/cadastros/termos', rotulo: 'Termos' },
] as const;

/** As partes do cadastro, cada uma com o seu endereço (dá para voltar e mandar o link). */
export function AbasDoCadastro() {
  return (
    <nav aria-label="Cadastros" className="max-w-full overflow-x-auto">
      <ul className="flex w-max gap-1.5 rounded-full border border-borda bg-white p-[5px] shadow-sm">
        {ABAS.map(({ rota, rotulo }) => (
          <li key={rota}>
            <NavLink
              to={rota}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 items-center rounded-full px-4 font-extrabold whitespace-nowrap foco-anel transition-colors duration-150 motion-reduce:transition-none',
                  isActive ? 'bg-azul text-white' : 'text-apagado hover:text-marinho',
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
