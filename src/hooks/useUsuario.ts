import { createContext, use } from 'react';

/**
 * Contexto fino de autenticação. O valor vem só da query `authKeys.me()`; o provedor fica em
 * `features/auth`, e os hooks ficam aqui para que qualquer feature leia o usuário sem importar
 * outra feature. Dados e ações em contextos separados: quem só mostra o nome não re-renderiza
 * quando as ações mudam. O papel vem de `acesso.usuarios`, nunca do JWT.
 */
export type Papel = 'coordenador' | 'coordenacao_geral' | 'contas_medicas';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
}

export interface AcoesDeAuth {
  login: (credenciais: { email: string; senha: string }) => Promise<void>;
  logout: () => Promise<void>;
}

/** Como o papel aparece na tela. */
export const ROTULO_DO_PAPEL: Record<Papel, string> = {
  coordenador: 'Coordenação de unidade',
  coordenacao_geral: 'Coordenação geral',
  contas_medicas: 'Contas médicas',
};

export const UsuarioContext = createContext<Usuario | null | undefined>(undefined);
export const AcoesDeAuthContext = createContext<AcoesDeAuth | undefined>(undefined);

/** Usuário autenticado, ou `null` quando ninguém entrou. */
export function useUsuario(): Usuario | null {
  const usuario = use(UsuarioContext);
  if (usuario === undefined) throw new Error('useUsuario precisa estar dentro do AuthProvider.');
  return usuario;
}

export function useAcoesDeAuth(): AcoesDeAuth {
  const acoes = use(AcoesDeAuthContext);
  if (acoes === undefined) throw new Error('useAcoesDeAuth precisa estar dentro do AuthProvider.');
  return acoes;
}
