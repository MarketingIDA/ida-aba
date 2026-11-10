import { Navigate, useParams } from 'react-router';

import { PessoasSecao } from '@/features/cadastros/routes/PessoasSecao';
import { PlanosSecao } from '@/features/cadastros/routes/PlanosSecao';
import { UnidadesSecao } from '@/features/cadastros/routes/UnidadesSecao';

const SECOES = { unidades: UnidadesSecao, planos: PlanosSecao, pessoas: PessoasSecao } as const;

const ehSecao = (aba: string | undefined): aba is keyof typeof SECOES =>
  aba !== undefined && Object.hasOwn(SECOES, aba);

/**
 * Cadastros da coordenação geral, uma parte por endereço (`/cadastros/unidades`,
 * `/cadastros/planos`, `/cadastros/pessoas`). Endereço sem parte conhecida vai para as unidades.
 */
export function CadastrosPage() {
  const { aba } = useParams();
  if (!ehSecao(aba)) return <Navigate to="/cadastros/unidades" replace />;
  const Secao = SECOES[aba];
  return <Secao />;
}
