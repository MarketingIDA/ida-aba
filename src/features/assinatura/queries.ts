import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  buscarAssinatura,
  enviarAssinatura,
  type TipoDeImagem,
} from '@/features/assinatura/api/assinatura.api';

export const assinaturaKeys = {
  all: ['assinatura'] as const,
  doUsuario: (usuarioId: number) => [...assinaturaKeys.all, usuarioId] as const,
};

export const assinaturaOptions = (usuarioId: number) =>
  queryOptions({
    queryKey: assinaturaKeys.doUsuario(usuarioId),
    queryFn: () => buscarAssinatura(usuarioId),
  });

/** Assinatura nova: depois de gravar, a tela mostra a que ficou no banco. */
export function useEnviarAssinatura(usuarioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ imagem, tipo }: { imagem: Blob; tipo: TipoDeImagem }) =>
      enviarAssinatura(usuarioId, imagem, tipo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assinaturaKeys.all }),
  });
}
