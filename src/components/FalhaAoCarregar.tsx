import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  titulo: string;
  mensagem: string;
  aoTentarDeNovo: () => void;
}

/** Falha de uma consulta: o que houve, em português, e "Tentar de novo". */
export function FalhaAoCarregar({ titulo, mensagem, aoTentarDeNovo }: Readonly<Props>) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-l-[6px] border-bloq-border border-l-bloq bg-superficie p-6 shadow-md"
    >
      <h2>{titulo}</h2>
      <p className="max-w-[60ch] text-sm text-texto-2">{mensagem}</p>
      <Button variant="secondary" onClick={aoTentarDeNovo}>
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </Button>
    </div>
  );
}
