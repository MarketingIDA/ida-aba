import { SearchX, ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router';

import { rotaInicial } from '@/app/navegacao';
import { EmptyState } from '@/components/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { type Papel, useUsuario } from '@/hooks/useUsuario';

const voltarAoInicio = (
  <Link to="/" className={buttonVariants({ variant: 'secondary' })}>
    Ir para o início
  </Link>
);

/** A raiz do sistema leva cada papel à sua primeira tela. */
export function InicioDoPapel() {
  const usuario = useUsuario();
  if (usuario === null) return <Navigate to="/login" replace />;
  return <Navigate to={rotaInicial(usuario.papel)} replace />;
}

/**
 * Mostra a tela só para os papéis dela. É só UX: o RLS do banco já não entrega os dados a quem
 * não pode, e esta guarda evita uma tela vazia ou um erro de permissão.
 */
export function ExigePapel({
  papeis,
  children,
}: Readonly<{ papeis: readonly Papel[]; children: ReactNode }>) {
  const usuario = useUsuario();
  if (usuario !== null && papeis.includes(usuario.papel)) return <>{children}</>;
  return (
    <section className="flex flex-col gap-6">
      <h1>Esta tela não é do seu perfil</h1>
      <EmptyState
        icone={ShieldX}
        titulo="Você não tem acesso a esta parte do sistema"
        descricao="Use o menu para chegar às telas do seu perfil. Se precisar deste acesso, fale com a coordenação geral."
        acao={voltarAoInicio}
      />
    </section>
  );
}

export function PaginaNaoEncontrada() {
  return (
    <section className="flex flex-col gap-6">
      <h1>Página não encontrada</h1>
      <EmptyState
        icone={SearchX}
        titulo="Este endereço não existe no sistema"
        descricao="Confira o endereço ou use o menu para chegar à tela que você procura."
        acao={voltarAoInicio}
      />
    </section>
  );
}
