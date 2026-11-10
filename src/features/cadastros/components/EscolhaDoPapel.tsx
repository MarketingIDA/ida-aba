import type { UseFormRegisterReturn } from 'react-hook-form';

import { type Papel, ROTULO_DO_PAPEL } from '@/hooks/useUsuario';

const OPCOES: readonly { papel: Papel; descricao: string }[] = [
  { papel: 'coordenador', descricao: 'Confere e conclui as evoluções da própria carteira.' },
  { papel: 'coordenacao_geral', descricao: 'Acompanha todas as unidades e mantém os cadastros.' },
  { papel: 'contas_medicas', descricao: 'Recebe o arquivo do mês de cada unidade.' },
];

const ERRO = 'pessoa-papel-erro';

interface Props extends UseFormRegisterReturn<'papel'> {
  erro?: string | undefined;
}

/**
 * O papel em cartões de rádio: cada um diz o que a pessoa faz no sistema. O cartão inteiro é o
 * alvo do toque; o nome do rádio é só o papel, e o que ele faz vem como descrição.
 */
export function EscolhaDoPapel({ erro, ...radio }: Readonly<Props>) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={erro === undefined ? undefined : ERRO}
    >
      <legend className="mb-1.5 text-sm font-bold text-marinho">Papel</legend>
      {OPCOES.map(({ papel, descricao }) => (
        <label
          key={papel}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-borda bg-superficie p-3 hover:border-borda-forte has-checked:border-azul has-checked:bg-info-soft has-focus-visible:shadow-[0_0_0_4px_var(--info-soft)]"
        >
          <input
            type="radio"
            value={papel}
            aria-labelledby={`papel-${papel}`}
            aria-describedby={`papel-${papel}-dica`}
            className="mt-0.5 size-5 shrink-0 accent-azul"
            {...radio}
          />
          <span className="flex flex-col gap-0.5">
            <span id={`papel-${papel}`} className="text-sm font-bold text-marinho">
              {ROTULO_DO_PAPEL[papel]}
            </span>
            <span id={`papel-${papel}-dica`} className="text-xs font-semibold text-apagado">
              {descricao}
            </span>
          </span>
        </label>
      ))}
      {erro !== undefined && (
        <p id={ERRO} className="text-xs font-bold text-bloq-text">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** Na própria linha, o papel aparece sem escolha: ninguém se tira da coordenação geral. */
export function PapelTravado({ papel }: Readonly<{ papel: Papel }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold text-marinho">Papel</p>
      <p className="rounded-md border border-borda bg-neutro-suave p-3 text-sm font-semibold text-texto-2">
        <b className="text-marinho">{ROTULO_DO_PAPEL[papel]}.</b> Para mudar o próprio papel ou se
        desativar, peça a outra coordenação geral.
      </p>
    </div>
  );
}
