/**
 * Erro que a camada `api` de cada feature lança: um código estável para a
 * interface decidir a mensagem, e uma mensagem já em português para mostrar ao usuário.
 * A `causa` guarda o erro original só para o log; nunca vai para a tela.
 */
export class ErroApp extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensagem: string, causa?: unknown) {
    super(mensagem, causa === undefined ? undefined : { cause: causa });
    this.name = 'ErroApp';
    this.codigo = codigo;
  }
}

export function ehErroApp(erro: unknown): erro is ErroApp {
  return erro instanceof ErroApp;
}
