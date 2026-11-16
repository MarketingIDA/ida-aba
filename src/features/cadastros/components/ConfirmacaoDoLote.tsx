import { Button } from '@/components/ui/button';

interface Props {
  texto: string;
  gravando: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/** Ao abrir a confirmação, o foco vai para ela. */
const focar = (elemento: HTMLElement | null) => {
  elemento?.focus();
};

/** O segundo passo do lote: quantos vão e para onde, e os botões de gravar e de desistir. */
export function ConfirmacaoDoLote({ texto, gravando, aoConfirmar, aoCancelar }: Readonly<Props>) {
  return (
    <div
      ref={focar}
      tabIndex={-1}
      role="group"
      aria-label="Confirmar a carteira"
      className="flex flex-col gap-3 rounded-xl border border-alerta-border bg-alerta-soft p-4 outline-none"
    >
      <p className="text-sm font-semibold text-alerta-text">{texto}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={gravando} onClick={aoConfirmar}>
          {gravando ? 'Gravando…' : 'Confirmar'}
        </Button>
        <Button variant="ghost" disabled={gravando} onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
