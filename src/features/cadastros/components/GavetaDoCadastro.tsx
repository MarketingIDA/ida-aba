import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao: string;
  /**
   * Quem está no formulário (o `id`, ou "novo"). Mudou, o formulário nasce de novo: reaberta ainda
   * na animação de saída, a janela não herda os valores digitados no outro.
   */
  chave: string | number;
  children: ReactNode;
}

/**
 * Janela do formulário de cadastro, no centro da tela (até 26/11/2026 era uma gaveta à direita).
 * Esc e o fundo fecham sem salvar; no celular, ocupa a tela quase toda.
 */
export function GavetaDoCadastro({
  aberta,
  aoFechar,
  titulo,
  descricao,
  chave,
  children,
}: Readonly<Props>) {
  return (
    <Dialog.Root
      open={aberta}
      onOpenChange={(abrir) => {
        if (!abrir) aoFechar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[39] bg-marinho/42 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-background text-sm shadow-lg transition duration-200 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex flex-col gap-1 border-b border-borda bg-superficie py-5 pr-14 pl-6">
            <Dialog.Title className="font-display text-2xl font-bold text-marinho">
              {titulo}
            </Dialog.Title>
            <Dialog.Description className="text-sm font-semibold text-texto-2">
              {descricao}
            </Dialog.Description>
          </div>
          <Fragment key={chave}>{children}</Fragment>
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
