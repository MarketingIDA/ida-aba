/**
 * Único lugar do app que escreve no console. Nunca recebe nome, e-mail, texto de evolução ou
 * caminho com assistido: de um erro só saem o nome e o código (dado de saúde não vai para log).
 * Um serviço de monitoramento, quando entrar, passa por aqui.
 */
type Nivel = 'info' | 'warn' | 'error';

interface ErroResumido {
  nome: string;
  codigo?: string;
}

/** Reduz qualquer erro ao nome e ao código, sem mensagem (que pode carregar dado pessoal). */
function resumirErro(erro: unknown): ErroResumido {
  if (erro instanceof Error) {
    const codigo = 'code' in erro && typeof erro.code === 'string' ? erro.code : undefined;
    return codigo === undefined ? { nome: erro.name } : { nome: erro.name, codigo };
  }
  return { nome: typeof erro };
}

function escrever(nivel: Nivel, mensagem: string, erro?: unknown): void {
  const registro = erro === undefined ? { mensagem } : { mensagem, erro: resumirErro(erro) };
  console[nivel](JSON.stringify({ nivel, ...registro }));
}

export const logger = {
  info(mensagem: string) {
    escrever('info', mensagem);
  },
  warn(mensagem: string, erro?: unknown) {
    escrever('warn', mensagem, erro);
  },
  error(mensagem: string, erro?: unknown) {
    escrever('error', mensagem, erro);
  },
};
