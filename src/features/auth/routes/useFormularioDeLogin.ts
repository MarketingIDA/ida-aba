import { type SubmitEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { MENSAGENS } from '@/features/auth/api/auth.api';
import { useAcoesDeAuth } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';

/** Só caminho interno (`/x`): nunca um redirecionamento para fora. */
function destinoDe(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'de' in estado) {
    const { de } = estado;
    if (typeof de === 'string' && de.startsWith('/') && !de.startsWith('//')) return de;
  }
  return '/';
}

const texto = (valor: FormDataEntryValue | null) => (typeof valor === 'string' ? valor : '');

/** Estado do formulário de login: envio, mensagem de erro e volta para a rota de origem. */
export function useFormularioDeLogin() {
  const { login } = useAcoesDeAuth();
  const navigate = useNavigate();
  const local = useLocation();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviando(true);
    setErro(null);
    try {
      await login({ email: texto(dados.get('email')), senha: texto(dados.get('senha')) });
      await navigate(destinoDe(local.state), { replace: true });
    } catch (falha) {
      setErro(ehErroApp(falha) ? falha.message : MENSAGENS.indisponivel);
      setEnviando(false);
    }
  }

  return { enviar, enviando, erro };
}
