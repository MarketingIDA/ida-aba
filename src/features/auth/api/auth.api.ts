import { z } from 'zod';

import type { Usuario } from '@/hooks/useUsuario';
import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';

/**
 * Única camada da feature que fala com o Supabase. O papel vem de `acesso.usuarios`, nunca do
 * JWT; o RLS só deixa o usuário ler a própria linha (a coordenação geral lê todas).
 */
const esquemaUsuario = z.object({
  id: z.number().int(),
  nome: z.string(),
  email: z.string(),
  papel: z.enum(['coordenador', 'coordenacao_geral', 'contas_medicas']),
  ativo: z.boolean(),
});

export const MENSAGENS = {
  credenciais_invalidas: 'E-mail ou senha incorretos.',
  sem_acesso: 'Esta conta não tem acesso ao sistema. Fale com a coordenação geral.',
  indisponivel: 'Não foi possível entrar agora. Tente de novo em instantes.',
} as const;

/** Usuário da sessão atual com a linha de `acesso.usuarios`, ou `null` sem sessão ou sem acesso. */
export async function buscarUsuarioAtual(): Promise<Usuario | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error !== null) return null;

  const resposta = await supabase
    .schema('acesso')
    .from('usuarios')
    .select('id, nome, email, papel, ativo')
    .eq('auth_user_id', data.user.id)
    .maybeSingle<unknown>();
  if (resposta.error !== null) {
    throw new ErroApp('usuario_indisponivel', MENSAGENS.indisponivel, resposta.error);
  }
  if (resposta.data === null) return null;

  const { ativo, ...usuario } = esquemaUsuario.parse(resposta.data);
  return ativo ? usuario : null;
}

/** Entra com e-mail e senha. A mensagem de credencial é sempre a mesma, exista ou não a conta. */
export async function entrar(credenciais: { email: string; senha: string }): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: credenciais.email,
    password: credenciais.senha,
  });
  if (error === null) return;
  const codigo = error.status === 400 ? 'credenciais_invalidas' : 'indisponivel';
  throw new ErroApp(codigo, MENSAGENS[codigo], error);
}

/** Sai de todos os dispositivos: a sessão vai embora do armazenamento e do servidor. */
export async function sair(): Promise<void> {
  await supabase.auth.signOut({ scope: 'global' });
}

/** Avisa quando a sessão acaba por fora (outra aba, expiração). Devolve a função que cancela. */
export function aoEncerrarSessao(aviso: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') aviso();
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

const MENSAGENS_DA_SENHA: Record<string, string> & { senha: string } = {
  weak_password: 'O login recusou esta senha. Use 15 caracteres ou mais e evite senhas comuns.',
  same_password: 'A senha nova precisa ser diferente da anterior.',
  senha: 'Não foi possível salvar a senha. Peça um novo link e tente de novo.',
};

/** Senha do primeiro acesso ou da recuperação: a sessão veio do link do e-mail. */
export async function definirSenha(senha: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error === null) {
    // Quem pediu senha nova pode temer outra sessão aberta: as outras saem, esta fica.
    await supabase.auth.signOut({ scope: 'others' });
    return;
  }
  const codigo = error.code ?? 'senha';
  throw new ErroApp(codigo, MENSAGENS_DA_SENHA[codigo] ?? MENSAGENS_DA_SENHA.senha, error);
}

/** Manda o link para criar uma senha nova; a resposta não diz se o e-mail existe. */
export async function pedirNovaSenha(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/primeiro-acesso`,
  });
  if (error === null) return;
  const codigo = error.status === 429 ? 'limite' : 'indisponivel';
  throw new ErroApp(
    codigo,
    codigo === 'limite'
      ? 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.'
      : MENSAGENS.indisponivel,
    error,
  );
}
