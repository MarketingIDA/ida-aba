import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { Seletor } from '@/components/Seletor';
import { Button } from '@/components/ui/button';
import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import type { PendenciaDaTita } from '@/features/cadastros/api/tita.api';
import { unidadesOptions, useLigarUnidadeDaTita } from '@/features/cadastros/queries';
import { contar, textoDaPendencia } from '@/features/cadastros/tita';
import { ehErroApp } from '@/lib/erroApp';

interface PropsDaLigacao {
  nomeNaTita: string;
  unidades: readonly Unidade[];
}

interface PropsDaEscolha {
  unidades: readonly Unidade[];
  escolha: string;
  aoEscolher: (valor: string) => void;
}

/** As unidades ativas daqui e a opção de não entrar. */
function EscolhaDaUnidade({ unidades, escolha, aoEscolher }: Readonly<PropsDaEscolha>) {
  const id = useId();
  return (
    <div className="flex min-w-56 flex-col gap-1">
      <label htmlFor={id} className="text-caption font-bold text-texto-2">
        Unidade daqui
      </label>
      <Seletor
        id={id}
        value={escolha}
        onChange={(evento) => {
          aoEscolher(evento.target.value);
        }}
      >
        <option value="">Escolha</option>
        {unidades
          .filter((unidade) => unidade.ativa)
          .map((unidade) => (
            <option key={unidade.id} value={String(unidade.id)}>
              {unidade.nome}
            </option>
          ))}
        <option value="nenhuma">Nenhuma: não entra, como a matriz</option>
      </Seletor>
    </div>
  );
}

/** A unidade nova da Tita: escolher a daqui (ou nenhuma) e ligar. Vale na próxima sincronização. */
function LigacaoDaUnidade({ nomeNaTita, unidades }: Readonly<PropsDaLigacao>) {
  const ligar = useLigarUnidadeDaTita();
  const [escolha, setEscolha] = useState('');
  if (ligar.isSuccess) {
    return (
      <p className="text-sm font-bold text-ok-text">
        Ligada. Sincronize de novo para trazer quem é dela.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <EscolhaDaUnidade unidades={unidades} escolha={escolha} aoEscolher={setEscolha} />
      <Button
        variant="secondary"
        disabled={escolha === '' || ligar.isPending}
        onClick={() => {
          ligar.mutate({ nomeNaTita, unidadeId: escolha === 'nenhuma' ? null : Number(escolha) });
        }}
      >
        Ligar
      </Button>
      {ligar.isError && (
        <p role="alert" className="w-full text-sm font-bold text-bloq-text">
          {ehErroApp(ligar.error) ? ligar.error.message : 'Não foi possível ligar agora.'}
        </p>
      )}
    </div>
  );
}

/** As pendências da última sincronização; a unidade nova da Tita se liga ali mesmo. */
export function PendenciasDaTita({
  pendencias,
}: Readonly<{ pendencias: readonly PendenciaDaTita[] }>) {
  const unidades = useQuery(unidadesOptions());
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-marinho">
        {contar(pendencias.length, 'pendência', 'pendências')} da última sincronização
      </h3>
      <ul
        aria-label="Pendências da Tita"
        className="flex max-h-96 flex-col divide-y divide-borda overflow-y-auto rounded-lg border border-borda"
      >
        {pendencias.map((pendencia) => (
          <li key={pendencia.id} className="flex flex-col gap-2 px-4 py-3 text-sm text-texto">
            <span>{textoDaPendencia(pendencia)}</span>
            {pendencia.tipo === 'unidade_desconhecida' && pendencia.detalhe !== null && (
              <LigacaoDaUnidade nomeNaTita={pendencia.detalhe} unidades={unidades.data ?? []} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
