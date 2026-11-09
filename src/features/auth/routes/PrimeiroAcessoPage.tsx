import { type SubmitEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { definirSenha } from '@/features/auth/api/auth.api';
import { CartaoDeAcesso, ErroDeAcesso } from '@/features/auth/components/CartaoDeAcesso';
import { useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';

/** Mínimo de caracteres (NIST 800-63B-4); a configuração do Supabase Auth é quem garante. */
export const SENHA_MINIMA = 15;
const SENHA_MAXIMA = 72;

const texto = (valor: FormDataEntryValue | null) => (typeof valor === 'string' ? valor : '');

/** A senha passa nas regras da tela, ou a mensagem do que falta. */
export function conferirSenha(senha: string, repetida: string): string | null {
  if (senha.length < SENHA_MINIMA)
    return `A senha precisa de ${String(SENHA_MINIMA)} caracteres ou mais.`;
  if (senha.length > SENHA_MAXIMA)
    return `A senha pode ter até ${String(SENHA_MAXIMA)} caracteres.`;
  if (senha !== repetida) return 'As duas senhas não são iguais.';
  return null;
}

function useCriarSenha() {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const recusa = conferirSenha(texto(dados.get('senha')), texto(dados.get('repetir')));
    setErro(recusa);
    if (recusa !== null) return;
    setEnviando(true);
    try {
      await definirSenha(texto(dados.get('senha')));
      await navigate('/', { replace: true });
    } catch (falha) {
      setErro(ehErroApp(falha) ? falha.message : 'Não foi possível salvar a senha.');
      setEnviando(false);
    }
  }
  return { enviar, enviando, erro };
}

function CampoDeSenha({ id, rotulo }: Readonly<{ id: string; rotulo: string }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} name={id} type="password" autoComplete="new-password" required />
    </div>
  );
}

function LinkVencido() {
  return (
    <CartaoDeAcesso
      titulo="Link vencido"
      descricao="O link do e-mail expirou ou já foi usado. Peça um novo à coordenação geral ou use “Esqueci minha senha”."
    >
      <Link
        to="/recuperar-senha"
        className={buttonVariants({ variant: 'primary', size: 'lg', className: 'mt-8 w-full' })}
      >
        Pedir um novo link
      </Link>
    </CartaoDeAcesso>
  );
}

/**
 * Primeiro acesso e senha nova: o link do convite ou da recuperação abre a sessão (o supabase-js
 * lê o fragmento da URL) e a pessoa cria a senha aqui.
 */
export function PrimeiroAcessoPage() {
  const usuario = useUsuario();
  const { enviar, enviando, erro } = useCriarSenha();
  if (usuario === null) return <LinkVencido />;
  const primeiroNome = usuario.nome.trim().split(/\s+/)[0] ?? usuario.nome;
  return (
    <CartaoDeAcesso
      titulo="Crie sua senha"
      descricao={`Olá, ${primeiroNome}. Use ${String(SENHA_MINIMA)} caracteres ou mais: uma frase que só você saiba funciona bem.`}
    >
      <form onSubmit={(e) => void enviar(e)} className="mt-8 flex flex-col gap-4" noValidate>
        <input type="hidden" name="username" autoComplete="username" value={usuario.email} />
        <CampoDeSenha id="senha" rotulo="Senha nova" />
        <CampoDeSenha id="repetir" rotulo="Repita a senha" />
        {erro !== null && <ErroDeAcesso>{erro}</ErroDeAcesso>}
        <Button type="submit" size="lg" disabled={enviando} className="mt-2 font-display">
          {enviando ? 'Salvando…' : 'Salvar senha e entrar'}
        </Button>
      </form>
    </CartaoDeAcesso>
  );
}
