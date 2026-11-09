import type { ReactNode } from 'react';

/*
 * Direção visual (skill frontend-design + design system IDA): um ponto de ousadia só, a faixa
 * com as quatro cores da marca no alto do cartão; título em Baloo 2, o resto em Nunito; conteúdo
 * alinhado à esquerda; nenhuma decoração além disso e uma única animação de entrada.
 */
export function CartaoDeAcesso({
  titulo,
  descricao,
  children,
}: Readonly<{ titulo: string; descricao: string; children: ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-4 sm:p-6">
      <section className="animate-entrar-tela overflow-hidden rounded-2xl bg-superficie shadow-lg motion-reduce:animate-none">
        <div aria-hidden="true" className="h-2 bg-gradiente-marca" />
        <div className="p-6 sm:p-8">
          <h1 className="text-[2.25rem] leading-none">{titulo}</h1>
          <p className="mt-2 max-w-[36ch] text-sm text-texto-2">{descricao}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

/** Mensagem de erro do formulário de acesso. */
export function ErroDeAcesso({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-bloq-border bg-bloq-soft px-3 py-2 text-sm text-bloq-text"
    >
      {children}
    </p>
  );
}
