import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { useGerarRascunho } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';

/** O segundo passo, quando já há texto: o que o rascunho novo faz com o texto atual. */
function Confirmacao({
  aoGerar,
  aoCancelar,
}: Readonly<{ aoGerar: () => void; aoCancelar: () => void }>) {
  return (
    <div
      role="group"
      aria-label="Confirmar o rascunho"
      className="flex flex-col gap-3 rounded-xl border border-alerta-border bg-alerta-soft p-4"
    >
      <p className="text-sm text-alerta-text">
        <b>Gerar o rascunho de novo?</b> Ele passa a ser o texto das partes 2 a 4, e elas voltam
        para a conferir. O texto atual fica guardado.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={aoGerar}>
          <Sparkles aria-hidden="true" />
          Gerar o rascunho
        </Button>
        <Button size="lg" variant="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** O andamento do pedido: gerando, gerado ou a recusa em português. */
function Andamento({ gerar }: Readonly<{ gerar: ReturnType<typeof useGerarRascunho> }>) {
  if (gerar.isPending) {
    return (
      <p role="status" className="text-sm text-apagado">
        Pode levar até um minuto. Não feche esta tela.
      </p>
    );
  }
  if (gerar.isSuccess) {
    return (
      <p role="status" className="text-sm font-semibold text-ok-text">
        Rascunho gerado. Confira as partes 2 a 4 abaixo.
      </p>
    );
  }
  if (!gerar.isError) return null;
  return (
    <p role="alert" className="text-sm font-bold text-bloq-text">
      {ehErroApp(gerar.error) ? gerar.error.message : 'Não foi possível gerar o rascunho.'}
    </p>
  );
}

/**
 * O rascunho pela IA a partir do PDF do Tita importado (E06). A IA escreve as partes 2 a 4, e o
 * coordenador confere cada uma. Se já há texto, o botão pede confirmação: o rascunho novo passa a
 * valer, e o texto anterior fica guardado como versão (E07).
 */
export function RascunhoDaIA({
  evolucao,
  bloqueio = null,
}: Readonly<{ evolucao: Evolucao; bloqueio?: string | null }>) {
  const gerar = useGerarRascunho(evolucao.id);
  const [confirmando, setConfirmando] = useState(false);
  const temTexto =
    evolucao.texto !== null || evolucao.metasAlcancadas !== null || evolucao.metasDoMes !== null;
  const pedir = () => {
    setConfirmando(false);
    gerar.mutate();
  };
  const rotulo = temTexto ? 'Gerar o rascunho de novo' : 'Gerar rascunho com a IA';

  return (
    <div className="flex flex-col items-start gap-2 border-t border-borda pt-4">
      <p className="max-w-[72ch] text-sm text-texto-2">
        A IA recebe as análises do período e os outros documentos, sem o nome do assistido, e
        escreve as partes 2 a 4 para você conferir.
      </p>
      {bloqueio !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {bloqueio}
        </p>
      )}
      {confirmando ? (
        <Confirmacao
          aoGerar={pedir}
          aoCancelar={() => {
            setConfirmando(false);
          }}
        />
      ) : (
        <Button
          size="lg"
          disabled={gerar.isPending || bloqueio !== null}
          onClick={() => {
            if (temTexto) setConfirmando(true);
            else pedir();
          }}
        >
          <Sparkles aria-hidden="true" />
          {gerar.isPending ? 'Gerando o rascunho…' : rotulo}
        </Button>
      )}
      <Andamento gerar={gerar} />
    </div>
  );
}
