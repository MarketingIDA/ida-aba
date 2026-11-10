import { ErroApp } from '@/lib/erroApp';

/**
 * Traduz o erro que a Data API devolve (código do Postgres ou do PostgREST) num `ErroApp` com
 * mensagem em português. Cada camada `api` passa as mensagens específicas da sua tabela; o que
 * não tiver mensagem própria cai na genérica.
 */
const CODIGOS = {
  '23505': 'duplicado',
  '23514': 'regra_violada',
  '42501': 'sem_permissao',
  // `.single()` sem linha: no UPDATE, é o RLS que escondeu a linha de quem não tem acesso.
  PGRST116: 'sem_permissao',
} as const;

type CodigoDoBanco = (typeof CODIGOS)[keyof typeof CODIGOS] | 'indisponivel';

export type MensagensDoBanco = Partial<Record<CodigoDoBanco, string>> & {
  /**
   * Regras dos triggers: recusam com 23514 e um `hint` fixo (ex.: `ultima_coordenacao_geral`).
   * Cada `hint` conhecido ganha a sua mensagem; o desconhecido cai na de `regra_violada`.
   */
  regras?: Readonly<Record<string, string>>;
};

const PADRAO: Record<CodigoDoBanco, string> = {
  duplicado: 'Já existe um cadastro com estes dados.',
  regra_violada: 'O cadastro não segue uma regra do sistema.',
  sem_permissao: 'Você não tem permissão para esta alteração.',
  indisponivel: 'Não foi possível falar com o servidor agora. Tente de novo em instantes.',
};

function codigoDe(erro: { code?: string }): CodigoDoBanco {
  const codigo = erro.code ?? '';
  return codigo in CODIGOS ? CODIGOS[codigo as keyof typeof CODIGOS] : 'indisponivel';
}

function mensagemDaRegra(hint: string | null | undefined, regras: MensagensDoBanco['regras']) {
  if (hint === null || hint === undefined || regras === undefined) return undefined;
  return Object.hasOwn(regras, hint) ? regras[hint] : undefined;
}

export function erroDoBanco(
  erro: { code?: string; hint?: string | null },
  mensagens: MensagensDoBanco = {},
): ErroApp {
  const codigo = codigoDe(erro);
  const daRegra =
    codigo === 'regra_violada' ? mensagemDaRegra(erro.hint, mensagens.regras) : undefined;
  return new ErroApp(codigo, daRegra ?? mensagens[codigo] ?? PADRAO[codigo], erro);
}
