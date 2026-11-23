import type { ReactNode } from 'react';

interface Props {
  /** À esquerda: a regra ou o andamento da tela (some no celular, como no protótipo). */
  regra?: ReactNode;
  /** À direita: as ações principais; no celular, dividem a largura, sem os ícones. */
  acoes?: ReactNode;
  /** Acima de tudo, em todas as larguras: o erro da última ação. */
  alerta?: ReactNode;
}

/**
 * A barra fixa no pé da tela, com a linha das cores da marca no alto (o `.bottombar` do
 * protótipo). Com o menu fixo, começa depois dele; o `main` do layout já deixa o espaço dela.
 */
export function BarraInferior({ regra, acoes, alerta }: Readonly<Props>) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-white/94 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(14_42_71/0.18)] backdrop-blur-md backdrop-saturate-[1.6] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradiente-marca before:content-[''] menu:left-[var(--menu-largura)]">
      <div className="mx-auto flex max-w-[var(--conteudo-max)] flex-wrap items-center gap-4 px-4 py-3 min-[761px]:flex-nowrap min-[761px]:px-6 min-[761px]:py-3.5">
        {alerta != null && (
          <p role="alert" className="w-full text-sm font-bold text-bloq-text">
            {alerta}
          </p>
        )}
        {regra !== undefined && (
          <p className="hidden items-center gap-2 text-[0.84rem] font-bold text-texto-2 min-[761px]:flex">
            {regra}
          </p>
        )}
        <div className="flex w-full items-center gap-2.5 min-[761px]:ml-auto min-[761px]:w-auto max-[760px]:[&_svg]:hidden max-[760px]:[&>*]:min-w-0 max-[760px]:[&>*]:flex-[1_1_0] max-[760px]:[&>*]:px-2.5 max-[760px]:[&>*]:text-center max-[760px]:[&>*]:text-sm max-[760px]:[&>*]:leading-[1.15] max-[760px]:[&>*]:whitespace-normal">
          {acoes}
        </div>
      </div>
    </div>
  );
}
