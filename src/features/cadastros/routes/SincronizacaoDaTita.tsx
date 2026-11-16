import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { ResumoDaSincronizacao } from '@/features/cadastros/api/tita.api';
import { PendenciasDaTita } from '@/features/cadastros/components/PendenciasDaTita';
import { PreviaDaSincronizacao } from '@/features/cadastros/components/PreviaDaSincronizacao';
import {
  pendenciasDaTitaOptions,
  ultimaSincronizacaoOptions,
  useSincronizarComATita,
} from '@/features/cadastros/queries';
import { contar, textoDaUltima } from '@/features/cadastros/tita';
import { ehErroApp } from '@/lib/erroApp';

/** Pede a simulação; com os números na mão, grava de verdade ou desiste. */
function useSincronizacaoEmDoisPassos() {
  const sincronizar = useSincronizarComATita();
  const [previa, setPrevia] = useState<ResumoDaSincronizacao | null>(null);
  const [aviso, setAviso] = useState('');
  return {
    sincronizar,
    previa,
    aviso,
    conferir: () => {
      setAviso('');
      sincronizar.mutate(true, {
        onSuccess: (resumo) => {
          setPrevia(resumo);
        },
      });
    },
    gravar: () => {
      sincronizar.mutate(false, {
        onSuccess: (resumo) => {
          setAviso(`Sincronizado: ${contar(resumo.criados, 'novo', 'novos')} na lista.`);
        },
        onSettled: () => {
          setPrevia(null);
        },
      });
    },
    desistir: () => {
      setPrevia(null);
    },
  };
}

/**
 * A Tita na tela de assistidos (E28): quando foi a última sincronização, o botão que primeiro
 * simula e mostra os números, e as pendências que pedem ação da coordenação geral.
 */
export function SincronizacaoDaTita() {
  const ultima = useQuery(ultimaSincronizacaoOptions());
  const pendencias = useQuery(pendenciasDaTitaOptions());
  const { sincronizar, previa, aviso, conferir, gravar, desistir } = useSincronizacaoEmDoisPassos();

  return (
    <section
      aria-labelledby="tita-titulo"
      className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-[72ch] flex-col gap-1">
          <h2 id="tita-titulo" className="text-base font-bold text-marinho">
            Tita
          </h2>
          <p className="text-sm font-semibold text-texto-2">
            {ultima.isPending ? 'Carregando…' : textoDaUltima(ultima.data ?? null)}
          </p>
        </div>
        {previa === null && (
          <Button variant="secondary" disabled={sincronizar.isPending} onClick={conferir}>
            <RefreshCw aria-hidden="true" />
            {sincronizar.isPending ? 'Consultando a Tita…' : 'Sincronizar com a Tita'}
          </Button>
        )}
      </div>
      {previa !== null && (
        <PreviaDaSincronizacao
          resumo={previa}
          gravando={sincronizar.isPending}
          aoConfirmar={gravar}
          aoCancelar={desistir}
        />
      )}
      <p role="status" className="text-sm font-bold text-ok-text">
        {aviso}
      </p>
      {sincronizar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(sincronizar.error)
            ? sincronizar.error.message
            : 'Não foi possível sincronizar.'}
        </p>
      )}
      {pendencias.data !== undefined && pendencias.data.length > 0 && (
        <PendenciasDaTita pendencias={pendencias.data} />
      )}
    </section>
  );
}
