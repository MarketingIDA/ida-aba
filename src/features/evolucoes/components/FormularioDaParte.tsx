import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  rotulo: string;
  salvando: boolean;
  erro: string | null;
  aoSalvar: () => void;
  aoCancelar: () => void;
  /** Ao lado dos botões: o contador de linhas ou de metas. */
  contador: ReactNode;
  children: ReactNode;
}

/** A edição de uma parte: os campos, o contador, o erro e "Cancelar" e salvar. */
export function FormularioDaParte({
  rotulo,
  salvando,
  erro,
  aoSalvar,
  aoCancelar,
  contador,
  children,
}: Readonly<Props>) {
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        aoSalvar();
      }}
    >
      {children}
      {erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto">{contador}</span>
        <Button type="button" variant="secondary" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          <Check aria-hidden="true" />
          {salvando ? 'Salvando…' : rotulo}
        </Button>
      </div>
    </form>
  );
}
