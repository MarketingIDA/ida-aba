import type { TextoAnterior } from '@/features/evolucoes/api/anterior.api';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { Nota } from '@/features/evolucoes/components/painel/Pendencia';
import { cn } from '@/lib/utils';
import { textoDaEvolucao } from '@dominio/evolucao.ts';
import { nomeDoMes } from '@dominio/mes.ts';
import { LIMITE_DE_SEMELHANCA, semelhanca } from '@dominio/semelhanca.ts';

/** O nome da aba: o mês anterior, com inicial maiúscula, ou "Mês anterior". */
export function rotuloDoAnterior(anterior: TextoAnterior | null): string {
  if (anterior === null) return 'Mês anterior';
  const nome = nomeDoMes(anterior.mesRef);
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

/**
 * A aba do mês anterior (P7): o texto da evolução do mês anterior do mesmo assistido, com quanto o
 * texto de agora se parece com ele.
 */
export function AnteriorDoPainel({
  evolucao,
  anterior,
}: Readonly<{ evolucao: Evolucao; anterior: TextoAnterior | null }>) {
  if (anterior === null) return <Nota>Não há evolução do mês anterior neste sistema.</Nota>;
  const parecido =
    evolucao.texto === null
      ? null
      : semelhanca(textoDaEvolucao(evolucao.texto.conteudo), anterior.texto);
  return (
    <div className="flex flex-col gap-2 rounded-[18px] border border-borda bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-extrabold tracking-[0.1em] text-apagado uppercase">
          Evolução de {nomeDoMes(anterior.mesRef)}
        </p>
        {parecido !== null && (
          <span
            className={cn(
              'rounded-full px-2 py-px text-[0.71875rem] font-extrabold whitespace-nowrap',
              parecido >= LIMITE_DE_SEMELHANCA
                ? 'bg-alerta-soft text-alerta-text'
                : 'bg-neutro-suave text-texto-2',
            )}
          >
            {parecido}% parecido
          </span>
        )}
      </div>
      <p className="text-sm whitespace-pre-line text-texto">{anterior.texto}</p>
    </div>
  );
}
