import { useInfiniteQuery } from '@tanstack/react-query';
import { History, ShieldCheck } from 'lucide-react';
import { useDeferredValue, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { Button } from '@/components/ui/button';
import type { FiltroDaAuditoria } from '@/features/auditoria/api/auditoria.api';
import { FiltrosDaAuditoria } from '@/features/auditoria/components/FiltrosDaAuditoria';
import { LinhaDoEvento } from '@/features/auditoria/components/LinhaDoEvento';
import { eventosOptions } from '@/features/auditoria/queries';
import { ehErroApp } from '@/lib/erroApp';

const SEM_FILTRO: FiltroDaAuditoria = { de: '', ate: '', usuarioId: null, tipo: '', registro: '' };

const CABECALHO = (
  <div className="flex max-w-[72ch] flex-col gap-1.5">
    <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.1em] text-info-text uppercase">
      <ShieldCheck aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      Rastreabilidade
    </p>
    <h1>Auditoria</h1>
    <p className="text-apagado">
      Quem fez o quê e quando: cada cadastro criado, alterado ou excluído, cada evolução, envio e
      download, e cada entrada e saída do sistema. A trilha não pode ser alterada por ninguém.
    </p>
  </div>
);

const CARREGANDO = (
  <p role="status" className="p-6 text-center text-apagado">
    Carregando…
  </p>
);

const VAZIO = (
  <div className="p-5">
    <EmptyState
      icone={History}
      titulo="Nenhum evento aqui"
      descricao="Mude o período ou os filtros para ver outros eventos."
    />
  </div>
);

function ListaDeEventos({ filtro }: Readonly<{ filtro: FiltroDaAuditoria }>) {
  const consulta = useInfiniteQuery(eventosOptions(filtro));
  if (consulta.isPending) return CARREGANDO;
  if (consulta.isError) {
    const mensagem = ehErroApp(consulta.error)
      ? consulta.error.message
      : 'Os dados chegaram num formato inesperado. Tente de novo.';
    return (
      <FalhaAoCarregar
        titulo="A auditoria não carregou"
        mensagem={mensagem}
        aoTentarDeNovo={() => void consulta.refetch()}
      />
    );
  }
  const eventos = consulta.data.pages.flat();
  if (eventos.length === 0) return VAZIO;
  return (
    <>
      <ul aria-label="Eventos da auditoria">
        {eventos.map((evento) => (
          <LinhaDoEvento key={evento.id} evento={evento} />
        ))}
      </ul>
      {consulta.hasNextPage && (
        <div className="border-t border-borda p-4 text-center">
          <Button
            variant="secondary"
            disabled={consulta.isFetchingNextPage}
            onClick={() => void consulta.fetchNextPage()}
          >
            {consulta.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </>
  );
}

/** A trilha de auditoria, só para a coordenação geral (o banco também recusa os outros papéis). */
export function AuditoriaPage() {
  const [filtro, setFiltro] = useState(SEM_FILTRO);
  const filtroAdiado = useDeferredValue(filtro);
  return (
    <div className="flex flex-col gap-5">
      {CABECALHO}
      <FiltrosDaAuditoria filtro={filtro} aoMudar={setFiltro} />
      <section className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-md">
        <ListaDeEventos filtro={filtroAdiado} />
      </section>
    </div>
  );
}
