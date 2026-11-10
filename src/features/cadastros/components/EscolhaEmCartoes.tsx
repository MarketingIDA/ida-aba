import type { UseFormRegisterReturn } from 'react-hook-form';

export interface OpcaoEmCartao {
  valor: string;
  rotulo: string;
  /** O que a escolha faz, ou por que não se escolhe agora. */
  descricao?: string | undefined;
  /** Não se escolhe agora (ex.: turno que já tem carteira); a descrição diz por quê. */
  indisponivel?: boolean;
}

interface Props extends UseFormRegisterReturn {
  /** Prefixo dos ids: dois grupos na mesma tela não se confundem. */
  id: string;
  legenda: string;
  opcoes: readonly OpcaoEmCartao[];
  erro?: string | undefined;
}

/**
 * Uma escolha em cartões de rádio. O cartão inteiro é o alvo do toque; o nome do rádio é só o
 * rótulo, e a descrição vem à parte. O erro fica ligado ao grupo (`fieldset`), não a cada rádio.
 */
export function EscolhaEmCartoes({ id, legenda, opcoes, erro, ...radio }: Readonly<Props>) {
  const idDoErro = `${id}-erro`;
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={erro === undefined ? undefined : idDoErro}
    >
      <legend className="mb-1.5 text-sm font-bold text-marinho">{legenda}</legend>
      {opcoes.map(({ valor, rotulo, descricao, indisponivel = false }) => (
        <label
          key={valor}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-borda bg-superficie p-3 hover:border-borda-forte has-checked:border-azul has-checked:bg-info-soft has-focus-visible:shadow-[0_0_0_4px_var(--info-soft)] has-disabled:cursor-not-allowed has-disabled:bg-neutro-suave has-disabled:hover:border-borda"
        >
          <input
            type="radio"
            value={valor}
            aria-labelledby={`${id}-${valor}`}
            aria-describedby={descricao === undefined ? undefined : `${id}-${valor}-dica`}
            className="mt-0.5 size-5 shrink-0 accent-azul"
            {...radio}
            disabled={indisponivel}
          />
          <span className="flex flex-col gap-0.5">
            <span id={`${id}-${valor}`} className="text-sm font-bold text-marinho">
              {rotulo}
            </span>
            {descricao !== undefined && (
              <span id={`${id}-${valor}-dica`} className="text-xs font-semibold text-apagado">
                {descricao}
              </span>
            )}
          </span>
        </label>
      ))}
      {erro !== undefined && (
        <p id={idDoErro} className="text-xs font-bold text-bloq-text">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
