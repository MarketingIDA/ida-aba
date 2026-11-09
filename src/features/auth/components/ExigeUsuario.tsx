import { Navigate, Outlet, useLocation } from 'react-router';

import { useUsuario } from '@/hooks/useUsuario';

/**
 * Guard de rota (UX, não segurança): sem usuário, manda para o login e lembra de onde veio.
 * Quem autoriza de verdade é o RLS do banco.
 */
export function ExigeUsuario() {
  const usuario = useUsuario();
  const local = useLocation();
  if (usuario === null) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }
  return <Outlet />;
}
