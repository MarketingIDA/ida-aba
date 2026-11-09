import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';

import { focoNoAzul, MenuLateral } from '@/app/layouts/MenuLateral';
import flor from '@/assets/marca/flower.png';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/*
 * Shell do app (docs/design-system/README.md §4). A partir de 1200 px (`menu:`) o menu azul fica
 * fixo à esquerda, com a onda na borda e a flor no alto; abaixo disso ele vira gaveta, aberta pela
 * barra do topo, que traz a onda embaixo.
 */
const MENU_FIXO = '(min-width: 75rem)';

const botaoNoAzul =
  'grid cursor-pointer place-items-center rounded-md bg-white/14 hover:bg-white/20 active:scale-[0.94]';

/** Fecha a gaveta quando a tela cresce e o menu volta a ficar fixo. */
function useFecharAoFixarMenu(fechar: () => void) {
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const consulta = globalThis.matchMedia(MENU_FIXO);
    const aoMudar = (evento: MediaQueryListEvent) => {
      if (evento.matches) fechar();
    };
    consulta.addEventListener('change', aoMudar);
    return () => {
      consulta.removeEventListener('change', aoMudar);
    };
  }, [fechar]);
}

function MenuFixo() {
  return (
    <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-[var(--menu-largura)] bg-azul text-white menu:block">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 900"
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-0 -right-[19px] h-full w-5 text-azul"
      >
        <path d="M0 0H8C19 120 3 240 11 370S20 610 7 740 13 860 15 900H0Z" fill="currentColor" />
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={flor} alt="" className="absolute -top-[34px] -right-7 w-[92px] rotate-[168deg]" />
      </div>
      <MenuLateral />
    </aside>
  );
}

function BarraDoTopo({ aoAbrirMenu }: Readonly<{ aoAbrirMenu: () => void }>) {
  return (
    <header className="sticky top-0 z-20 bg-azul text-white">
      <div className="mx-auto flex h-[68px] max-w-[var(--conteudo-max)] items-center gap-3 px-4 sm:px-6 menu:h-[26px]">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={aoAbrirMenu}
          className={cn(botaoNoAzul, '-ml-1.5 size-10 menu:hidden', focoNoAzul)}
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </button>
        <span className="font-display text-lg font-bold menu:hidden">Evolução ABA</span>
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 30"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-full h-[30px] w-full text-azul"
      >
        <path d="M0 0H1600V12C1376 28 1184 4 960 13S512 30 288 19 96 7 0 16Z" fill="currentColor" />
      </svg>
    </header>
  );
}

function itemAtivoDaGaveta(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="sheet-content"] [aria-current="page"]');
}

function GavetaDoMenu({
  aberta,
  aoMudar,
}: Readonly<{ aberta: boolean; aoMudar: (aberta: boolean) => void }>) {
  return (
    <Sheet open={aberta} onOpenChange={aoMudar}>
      <SheetContent
        side="left"
        showCloseButton={false}
        initialFocus={itemAtivoDaGaveta}
        className="z-40 gap-0 border-0 bg-azul p-0 text-white shadow-[24px_0_48px_-16px_rgb(14_42_71/0.45)] duration-[280ms] ease-gaveta data-[side=left]:w-[min(var(--menu-largura),85vw)] data-[side=left]:border-r-0 data-[side=left]:data-ending-style:-translate-x-[calc(100%+24px)] data-[side=left]:data-starting-style:-translate-x-[calc(100%+24px)] motion-reduce:transition-none menu:hidden"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <MenuLateral
          aoNavegar={() => {
            aoMudar(false);
          }}
          botaoFechar={
            <SheetClose aria-label="Fechar menu" className={cn(botaoNoAzul, 'size-9', focoNoAzul)}>
              <X aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </SheetClose>
          }
        />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout() {
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [fecharGaveta] = useState(() => () => {
    setGavetaAberta(false);
  });
  useFecharAoFixarMenu(fecharGaveta);

  return (
    <div className="min-h-dvh menu:pl-[var(--menu-largura)]">
      <a
        href="#conteudo"
        className="sr-only z-[60] rounded-md bg-marinho px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <MenuFixo />
      <BarraDoTopo
        aoAbrirMenu={() => {
          setGavetaAberta(true);
        }}
      />
      <GavetaDoMenu aberta={gavetaAberta} aoMudar={setGavetaAberta} />
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-[var(--conteudo-max)] px-4 pt-12 pb-16 outline-none sm:px-6 menu:pt-14"
      >
        <Outlet />
      </main>
    </div>
  );
}
