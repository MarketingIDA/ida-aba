import type { Papel, Usuario } from '@/hooks/useUsuario';

/** Linha de `acesso.usuarios` como a Data API devolve. Nenhum nome aqui é de pessoa real. */
export interface LinhaUsuario extends Usuario {
  ativo: boolean;
}

/** `auth.users.id` fictício da conta demo nos handlers. */
export const AUTH_USER_ID_DEMO = '11111111-1111-4111-8111-111111111111';

/** Senha só dos handlers de teste: a conta real é criada no painel e a senha fica com o usuário. */
export const SENHA_DEMO = 'senha-ficticia-de-teste';

const POR_PAPEL: Record<Papel, Omit<LinhaUsuario, 'papel' | 'ativo'>> = {
  coordenador: {
    id: 2,
    nome: 'Carla Fictícia Coordenadora',
    email: 'coordenacao.demo@evolucao-aba.test',
  },
  coordenacao_geral: {
    id: 1,
    nome: 'Gabriela Fictícia Geral',
    email: 'geral.demo@evolucao-aba.test',
  },
  contas_medicas: { id: 3, nome: 'Caio Fictício Contas', email: 'contas.demo@evolucao-aba.test' },
};

/** Usuário demo; por padrão, o coordenador da carteira fictícia. */
export function usuarioDemo(sobrescrever: Partial<LinhaUsuario> = {}): LinhaUsuario {
  const papel = sobrescrever.papel ?? 'coordenador';
  return { ...POR_PAPEL[papel], papel, ativo: true, ...sobrescrever };
}
