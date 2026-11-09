import { type SubmitEvent, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pedirNovaSenha } from '@/features/auth/api/auth.api';
import { CartaoDeAcesso, ErroDeAcesso } from '@/features/auth/components/CartaoDeAcesso';
import { ehErroApp } from '@/lib/erroApp';

type Estado = 'pronto' | 'enviando' | 'enviado';

function usePedidoDeSenha() {
  const [estado, setEstado] = useState<Estado>('pronto');
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = new FormData(evento.currentTarget).get('email');
    if (typeof email !== 'string' || !email.includes('@')) {
      setErro('Informe o e-mail que você usa para entrar.');
      return;
    }
    setErro(null);
    setEstado('enviando');
    try {
      await pedirNovaSenha(email.trim().toLowerCase());
      setEstado('enviado');
    } catch (falha) {
      setErro(ehErroApp(falha) ? falha.message : 'Não foi possível enviar agora.');
      setEstado('pronto');
    }
  }
  return { estado, erro, enviar };
}

/** "Esqueci minha senha": o link do e-mail leva ao primeiro acesso, onde a pessoa cria outra. */
export function RecuperarSenhaPage() {
  const { estado, erro, enviar } = usePedidoDeSenha();
  return (
    <CartaoDeAcesso
      titulo="Senha nova"
      descricao="Mandamos um link para o seu e-mail. Ele abre a tela para criar outra senha."
    >
      {estado === 'enviado' ? (
        <p role="status" className="mt-8 text-sm font-semibold text-ok-text">
          Se o e-mail estiver cadastrado, o link chega em instantes. Confira também o spam.
        </p>
      ) : (
        <form onSubmit={(e) => void enviar(e)} className="mt-8 flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          {erro !== null && <ErroDeAcesso>{erro}</ErroDeAcesso>}
          <Button
            type="submit"
            size="lg"
            disabled={estado === 'enviando'}
            className="mt-2 font-display"
          >
            {estado === 'enviando' ? 'Enviando…' : 'Enviar o link'}
          </Button>
        </form>
      )}
      <Link
        to="/login"
        className="mt-4 inline-block text-sm font-semibold text-azul-escuro underline-offset-4 foco-anel hover:underline"
      >
        Voltar para o login
      </Link>
    </CartaoDeAcesso>
  );
}
