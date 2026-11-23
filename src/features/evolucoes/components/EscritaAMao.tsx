import { PenLine, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { useAprimorarTexto } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';
import { textoDaEvolucao } from '@dominio/evolucao.ts';

/** O andamento do pedido: aprimorando, pronto ou a recusa em português. */
function Andamento({ aprimorar }: Readonly<{ aprimorar: ReturnType<typeof useAprimorarTexto> }>) {
  if (aprimorar.isPending) {
    return (
      <p role="status" className="text-sm text-apagado">
        Pode levar até um minuto. Não feche esta tela.
      </p>
    );
  }
  if (aprimorar.isSuccess) {
    return (
      <p role="status" className="text-sm font-semibold text-ok-text">
        Pronto. Confira a evolução mensal; o seu texto fica guardado em “Versões desta parte”.
      </p>
    );
  }
  if (!aprimorar.isError) return null;
  return (
    <p role="alert" className="text-sm font-bold text-bloq-text">
      {ehErroApp(aprimorar.error) ? aprimorar.error.message : 'Não foi possível aprimorar o texto.'}
    </p>
  );
}

/**
 * A evolução escrita à mão (E26): o alerta de que não há PDF do Tita e, para o coordenador, o
 * "Aprimorar com a IA", que melhora a linguagem da evolução mensal sem acrescentar fato. As metas
 * não mudam: o texto delas é o do cadastro.
 */
export function EscritaAMao({
  evolucao,
  ocupado,
}: Readonly<{ evolucao: Evolucao; ocupado: boolean }>) {
  const aprimorar = useAprimorarTexto(evolucao.id);
  if (evolucao.origem !== 'manual') return null;
  const podeAprimorar = evolucao.editavel && evolucao.situacao === 'em_conferencia';
  const temTexto =
    evolucao.texto !== null && textoDaEvolucao(evolucao.texto.conteudo).trim() !== '';
  return (
    <section
      aria-label="Escrita à mão"
      className="flex flex-col items-start gap-2 rounded-xl border border-alerta-border bg-alerta-soft p-4"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-alerta-text">
        <PenLine aria-hidden="true" className="size-4 shrink-0" />
        Escrita à mão, sem o PDF do Tita
      </p>
      {podeAprimorar && (
        <>
          <p className="max-w-[72ch] text-sm text-texto-2">
            A IA melhora a linguagem da evolução mensal (termos técnicos, terceira pessoa, termos da
            lista) sem acrescentar fato. O nome do assistido sai antes, e o seu texto fica guardado.
            As metas não mudam.
          </p>
          <Button
            size="lg"
            disabled={ocupado || !temTexto || aprimorar.isPending}
            onClick={() => {
              aprimorar.mutate();
            }}
          >
            <Sparkles aria-hidden="true" />
            {aprimorar.isPending ? 'Aprimorando…' : 'Aprimorar com a IA'}
          </Button>
          <Andamento aprimorar={aprimorar} />
        </>
      )}
    </section>
  );
}
