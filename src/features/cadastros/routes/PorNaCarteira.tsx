import { useState } from 'react';

import { Seletor } from '@/components/Seletor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { type AssistidoNaTela, opcoesDeCarteiraDoAssistido } from '@/features/cadastros/assistidos';
import type { CarteiraNaTela } from '@/features/cadastros/carteiras';
import { ConfirmacaoDoLote } from '@/features/cadastros/components/ConfirmacaoDoLote';
import { usePorRascunhosNaCarteira } from '@/features/cadastros/queries';
import { textoDaConfirmacao, textoDoLote, vaiEmLote } from '@/features/cadastros/rascunhos';
import type { Marcacao } from '@/features/cadastros/routes/useMarcacao';
import { contar } from '@/features/cadastros/tita';
import { ehErroApp } from '@/lib/erroApp';

interface Props {
  /** Os rascunhos da lista filtrada: "Marcar todos da lista" marca os que podem ir. */
  lista: readonly AssistidoNaTela[];
  marcacao: Marcacao;
  carteiras: readonly CarteiraNaTela[];
  aoAvisar: (texto: string) => void;
}

/** Quantos estão marcados, os botões de marcar e desmarcar, e o aviso dos que não podem ir. */
function Marcados({ lista, marcacao }: Readonly<Pick<Props, 'lista' | 'marcacao'>>) {
  const podem = lista.filter(vaiEmLote);
  const semGenero = lista.length - podem.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={podem.every((a) => marcacao.marcado(a.id))}
          onClick={() => {
            marcacao.marcarTodos(podem);
          }}
        >
          Marcar todos da lista
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={marcacao.marcados.length === 0}
          onClick={marcacao.limpar}
        >
          Desmarcar todos
        </Button>
        <p aria-live="polite" className="text-xs font-semibold text-apagado">
          {contar(marcacao.marcados.length, 'marcado', 'marcados')}.
        </p>
      </div>
      {semGenero > 0 && (
        <p className="text-xs font-semibold text-alerta-text">
          {contar(semGenero, 'rascunho sem gênero fica', 'rascunhos sem gênero ficam')} de fora:
          escolha o gênero e a carteira no cadastro de cada um.
        </p>
      )}
    </div>
  );
}

/** Marcar, escolher a carteira e confirmar; grava e devolve o aviso, ou mostra o erro. */
function usePorEmDoisPassos({ marcacao, aoAvisar }: Pick<Props, 'marcacao' | 'aoAvisar'>) {
  const [confirmando, setConfirmando] = useState(false);
  const por = usePorRascunhosNaCarteira();
  const confirmar = (carteira: CarteiraNaTela) => {
    por.mutate(
      { ids: marcacao.marcados.map((a) => a.id), carteiraId: carteira.id },
      {
        onSuccess: (resultado) => {
          aoAvisar(textoDoLote(resultado, carteira));
          marcacao.limpar();
          setConfirmando(false);
        },
      },
    );
  };
  return { por, confirmando, setConfirmando, confirmar };
}

interface PropsDaEscolha {
  carteiras: readonly CarteiraNaTela[];
  carteiraId: string;
  aoEscolher: (carteiraId: string) => void;
  podePor: boolean;
  aoPor: () => void;
}

/** As carteiras ativas e o botão que abre a confirmação. */
function EscolhaDaCarteira({
  carteiras,
  carteiraId,
  aoEscolher,
  podePor,
  aoPor,
}: Readonly<PropsDaEscolha>) {
  return (
    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="carteira-do-lote">Carteira dos marcados</Label>
        <Seletor
          id="carteira-do-lote"
          value={carteiraId}
          onChange={(evento) => {
            aoEscolher(evento.target.value);
          }}
        >
          <option value="">Escolha a carteira</option>
          {opcoesDeCarteiraDoAssistido(carteiras).map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Seletor>
      </div>
      <Button disabled={!podePor} onClick={aoPor}>
        Pôr na carteira
      </Button>
    </div>
  );
}

/**
 * Os rascunhos da Tita numa carteira, em lote (E28): marcar vários (um a um ou todos da lista),
 * escolher uma carteira ativa e confirmar. Cada um leva a unidade da carteira.
 */
export function PorNaCarteira({ lista, marcacao, carteiras, aoAvisar }: Readonly<Props>) {
  const [carteiraId, setCarteiraId] = useState('');
  const { por, confirmando, setConfirmando, confirmar } = usePorEmDoisPassos({
    marcacao,
    aoAvisar,
  });
  const carteira = carteiras.find((c) => String(c.id) === carteiraId);
  const { marcados } = marcacao;
  return (
    <section
      aria-label="Pôr na carteira"
      className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4 shadow-sm"
    >
      <Marcados lista={lista} marcacao={marcacao} />
      <EscolhaDaCarteira
        carteiras={carteiras}
        carteiraId={carteiraId}
        aoEscolher={(id) => {
          setCarteiraId(id);
          setConfirmando(false);
        }}
        podePor={marcados.length > 0 && carteira !== undefined && !confirmando}
        aoPor={() => {
          setConfirmando(true);
        }}
      />
      {confirmando && carteira !== undefined && marcados.length > 0 && (
        <ConfirmacaoDoLote
          texto={textoDaConfirmacao(marcados, carteira)}
          gravando={por.isPending}
          aoConfirmar={() => {
            confirmar(carteira);
          }}
          aoCancelar={() => {
            setConfirmando(false);
          }}
        />
      )}
      {por.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(por.error) ? por.error.message : 'Não foi possível pôr na carteira.'}
        </p>
      )}
    </section>
  );
}
