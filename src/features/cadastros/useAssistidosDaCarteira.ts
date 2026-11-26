import { useQuery } from '@tanstack/react-query';

import type { Assistido } from '@/features/cadastros/api/assistidos.api';
import { assistidosOptions, carteirasOptions } from '@/features/cadastros/queries';
import { useUsuario } from '@/hooks/useUsuario';

/**
 * Os assistidos das telas de acompanhamento (metas e gráficos): a coordenação geral vê todos; o
 * coordenador, só os das carteiras dele. Ele lê todos os assistidos para o cadastro, mas as
 * metas e as evoluções dos outros não são dele (o banco recorta por carteira).
 */
export function useAssistidosDaCarteira({ enabled = true }: { enabled?: boolean } = {}) {
  const usuario = useUsuario();
  const coordenador = usuario?.papel === 'coordenador';
  const assistidos = useQuery({ ...assistidosOptions(), enabled });
  const carteiras = useQuery({ ...carteirasOptions(), enabled: enabled && coordenador });

  let data: Assistido[] | undefined = assistidos.data;
  if (coordenador) {
    const minhas = new Set(
      (carteiras.data ?? []).filter((c) => c.coordenadorId === usuario.id).map((c) => c.id),
    );
    data =
      assistidos.data === undefined || carteiras.data === undefined
        ? undefined
        : assistidos.data.filter((a) => a.carteiraId !== null && minhas.has(a.carteiraId));
  }
  const error = assistidos.error ?? (coordenador ? carteiras.error : null);
  return {
    data,
    error,
    isPending: data === undefined && error === null,
    isSuccess: data !== undefined,
    refetch: async () => {
      await Promise.all([assistidos.refetch(), coordenador ? carteiras.refetch() : null]);
    },
  };
}
