import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CartaoDeAcesso, ErroDeAcesso } from '@/features/auth/components/CartaoDeAcesso';
import { useFormularioDeLogin } from '@/features/auth/routes/useFormularioDeLogin';

function Campo({
  id,
  rotulo,
  tipo,
  autoComplete,
}: Readonly<{ id: string; rotulo: string; tipo: string; autoComplete: string }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} name={id} type={tipo} autoComplete={autoComplete} required />
    </div>
  );
}

export function LoginPage() {
  const { enviar, enviando, erro } = useFormularioDeLogin();

  return (
    <CartaoDeAcesso
      titulo="Evolução ABA"
      descricao="Evolução mensal da intervenção ABA do Instituto do Autismo."
    >
      <form onSubmit={(e) => void enviar(e)} className="mt-8 flex flex-col gap-4" noValidate>
        <Campo id="email" rotulo="E-mail" tipo="email" autoComplete="username" />
        <Campo id="senha" rotulo="Senha" tipo="password" autoComplete="current-password" />
        {erro !== null && <ErroDeAcesso>{erro}</ErroDeAcesso>}
        <Button type="submit" size="lg" disabled={enviando} className="mt-2 font-display">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link
          to="/recuperar-senha"
          className="self-start text-sm font-semibold text-azul-escuro underline-offset-4 foco-anel hover:underline"
        >
          Esqueci minha senha
        </Link>
      </form>
    </CartaoDeAcesso>
  );
}
