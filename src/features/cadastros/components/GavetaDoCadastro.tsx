import { Fragment, type ReactNode } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao: string;
  /**
   * Quem está no formulário (o `id`, ou "novo"). Mudou, o formulário nasce de novo: reaberta ainda
   * na animação de saída, a gaveta não herda os valores digitados no outro.
   */
  chave: string | number;
  children: ReactNode;
}

/** Gaveta da direita com o formulário de cadastro; Esc e o fundo fecham sem salvar. */
export function GavetaDoCadastro({
  aberta,
  aoFechar,
  titulo,
  descricao,
  chave,
  children,
}: Readonly<Props>) {
  return (
    <Sheet
      open={aberta}
      onOpenChange={(abrir) => {
        if (!abrir) aoFechar();
      }}
    >
      <SheetContent
        side="right"
        className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"
      >
        <SheetHeader className="gap-1 border-b border-borda bg-superficie py-5 pr-12 pl-5">
          <SheetTitle className="font-display text-xl font-bold text-marinho">{titulo}</SheetTitle>
          <SheetDescription className="text-sm font-semibold text-texto-2">
            {descricao}
          </SheetDescription>
        </SheetHeader>
        <Fragment key={chave}>{children}</Fragment>
      </SheetContent>
    </Sheet>
  );
}
