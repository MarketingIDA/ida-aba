import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { evolucoes, prontoParaEnviar } from '@/features/arquivo-do-mes/logica';
import { useEnviarArquivo } from '@/features/arquivo-do-mes/queries';
import { ehErroApp } from '@/lib/erroApp';
import { nomeDoMes } from '@dominio/mes.ts';

interface Props {
  carteira: CarteiraDoMes;
  mes: string;
}

/** Ao abrir a confirmação, o foco vai para ela: o botão que a abriu sai da tela. */
const focar = (elemento: HTMLElement | null) => {
  elemento?.focus();
};

interface PropsDaConfirmacao {
  pergunta: string;
  enviando: boolean;
  aoEnviar: () => void;
  aoCancelar: () => void;
}

/** O segundo passo: o que o envio faz, e os botões de enviar e de desistir. */
function Confirmacao({ pergunta, enviando, aoEnviar, aoCancelar }: Readonly<PropsDaConfirmacao>) {
  return (
    <div
      ref={focar}
      tabIndex={-1}
      role="group"
      aria-label="Confirmar o envio"
      className="flex flex-col gap-3 rounded-xl border border-alerta-border bg-alerta-soft p-4 outline-none"
    >
      <p className="text-sm text-alerta-text">
        <b>{pergunta}</b> O envio não tem volta: as evoluções ficam só para leitura, e a carteira
        não abre outra evolução neste mês.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={enviando} onClick={aoEnviar}>
          <Send aria-hidden="true" />
          {enviando ? 'Enviando…' : 'Enviar o arquivo'}
        </Button>
        <Button size="lg" variant="ghost" disabled={enviando} onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * O envio a contas médicas, em dois passos: o envio não tem volta, então o botão abre a
 * confirmação com o que vai acontecer. O botão só habilita com tudo o que o banco exige (E24).
 */
export function EnvioDoArquivo({ carteira, mes }: Readonly<Props>) {
  const enviar = useEnviarArquivo();
  const [confirmando, setConfirmando] = useState(false);
  const fechar = () => {
    setConfirmando(false);
  };

  if (confirmando) {
    return (
      <Confirmacao
        pergunta={`Enviar o arquivo de ${nomeDoMes(mes)} com ${evolucoes(carteira.concluidas)}?`}
        enviando={enviar.isPending}
        aoEnviar={() => {
          enviar.mutate(carteira.carteiraId, { onSettled: fechar });
        }}
        aoCancelar={fechar}
      />
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      {enviar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(enviar.error) ? enviar.error.message : 'Não foi possível enviar agora.'}
        </p>
      )}
      <Button
        size="lg"
        disabled={!prontoParaEnviar(carteira)}
        onClick={() => {
          setConfirmando(true);
        }}
      >
        <Send aria-hidden="true" />
        Enviar a contas médicas
      </Button>
    </div>
  );
}
