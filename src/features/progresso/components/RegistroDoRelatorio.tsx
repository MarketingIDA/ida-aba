import { useQuery } from '@tanstack/react-query';
import { Download, Link2, Send } from 'lucide-react';

import type { AcaoDoRelatorio } from '@/features/progresso/api/relatorio.api';
import { registroOptions } from '@/features/progresso/queries';

const ACAO: Record<AcaoDoRelatorio, { rotulo: string; Icone: typeof Download }> = {
  baixou: { rotulo: 'Baixou o PDF', Icone: Download },
  enviou: { rotulo: 'Enviou o PDF', Icone: Send },
  baixou_para_enviar: { rotulo: 'Baixou o PDF para enviar', Icone: Download },
  copiou_link: { rotulo: 'Copiou o link', Icone: Link2 },
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Quem baixou, enviou ou copiou o link do relatório, do mais recente ao mais antigo (E28). */
export function RegistroDoRelatorio({ assistidoId }: Readonly<{ assistidoId: number }>) {
  const registro = useQuery(registroOptions(assistidoId));
  return (
    <section className="flex flex-col gap-2" aria-labelledby="registro-do-relatorio">
      <h3 id="registro-do-relatorio" className="rotulo text-apagado">
        Registro
      </h3>
      {registro.isPending && <p role="status">Carregando o registro…</p>}
      {registro.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          Não foi possível carregar o registro agora.
        </p>
      )}
      {registro.data?.length === 0 && (
        <p className="text-sm text-texto-2">Nenhum download ou envio ainda.</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {registro.data?.map((r) => {
          const { rotulo, Icone } = ACAO[r.acao];
          return (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <Icone aria-hidden="true" className="size-3.5 shrink-0 text-apagado" />
              <span className="min-w-0 flex-1">
                <b className="text-marinho">{rotulo}</b> · {r.feitoPorNome}
              </span>
              <small className="text-caption font-semibold text-apagado">{quando(r.feitoEm)}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
