import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  children: ReactNode;
}

/**
 * Janela no centro da tela, com título, descrição e o botão de fechar. Desde 26/11/2026 nenhuma
 * tela abre em gaveta lateral: tudo o que abria à direita abre aqui. Esc e o fundo fecham; no
 * celular, ocupa a tela quase toda.
 */
export function Janela({ aberta, aoMudar, titulo, descricao, children }: Readonly<Props>) {
  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[39] bg-marinho/42 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-background text-sm shadow-lg transition duration-200 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex flex-col gap-1 border-b border-borda bg-superficie py-5 pr-14 pl-6">
            <Dialog.Title className="font-display text-xl font-bold text-marinho">
              {titulo}
            </Dialog.Title>
            <Dialog.Description className="text-sm font-semibold text-texto-2">
              {descricao}
            </Dialog.Description>
          </div>
          {children}
          <Dialog.Close
            render={<Button variant="ghost" className="absolute top-4 right-4" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Fechar</span>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
