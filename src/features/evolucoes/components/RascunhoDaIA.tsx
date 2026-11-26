import { Sparkles } from 'lucide-react';
import { type ReactNode, useState } from 'react';

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
      className="flex flex-col gap-3 rounded-xl border border-alerta-border bg-alerta-soft p-4 shadow-lg"
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

/** Os avisos que flutuam junto dos botões precisam de fundo próprio. */
const AVISO = 'rounded-xl border border-borda bg-superficie px-3 py-2 text-sm shadow-lg';

/** O andamento do pedido: gerando, gerado ou a recusa em português. */
function Andamento({ gerar }: Readonly<{ gerar: ReturnType<typeof useGerarRascunho> }>) {
  if (gerar.isPending) {
    return (
      <p role="status" className={`${AVISO} text-apagado`}>
        Pode levar até um minuto. Não feche esta tela.
      </p>
    );
  }
  if (gerar.isSuccess) {
    return (
      <p role="status" className={`${AVISO} font-semibold text-ok-text`}>
        Rascunho gerado. Confira as partes 2 a 4 abaixo.
      </p>
    );
  }
  if (!gerar.isError) return null;
  return (
    <p role="alert" className={`${AVISO} font-bold text-bloq-text`}>
      {ehErroApp(gerar.error) ? gerar.error.message : 'Não foi possível gerar o rascunho.'}
    </p>
  );
}

/** O que a IA recebe e, se houver, o que impede o rascunho: fica no cartão, não flutua. */
function Explicacao({ bloqueio }: Readonly<{ bloqueio: string | null }>) {
  return (
    <>
      <p className="max-w-[72ch] text-sm text-texto-2">
        A IA recebe as análises do período e os outros documentos, sem o nome do assistido, e
        escreve as partes 2 a 4 para você conferir.
      </p>
      {bloqueio !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {bloqueio}
        </p>
      )}
    </>
  );
}

/**
 * O rascunho pela IA a partir do PDF do Tita importado (E06). A IA escreve as partes 2 a 4, e o
 * coordenador confere cada uma. Se já há texto, o botão pede confirmação: o rascunho novo passa a
 * valer, e o texto anterior fica guardado como versão (E07).
 *
 * Os botões flutuam no canto direito da tela e acompanham a rolagem, acima da barra inferior; o
 * "Importar de novo" vem como `children` e flutua junto.
 */
export function RascunhoDaIA({
  evolucao,
  bloqueio = null,
  children,
}: Readonly<{ evolucao: Evolucao; bloqueio?: string | null; children?: ReactNode }>) {
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
      <Explicacao bloqueio={bloqueio} />
      <div
        role="group"
        aria-label="Ações do PDF do Tita"
        className="fixed right-4 bottom-24 z-30 flex max-w-[min(22rem,calc(100vw-2rem))] flex-col items-end gap-2 [&_button]:shadow-lg"
      >
        <Andamento gerar={gerar} />
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
        {children}
      </div>
    </div>
  );
}
