import { useState } from 'react';

import { type ImagemPronta, prepararImagem } from '@/features/assinatura/imagem';
import { useEnviarAssinatura } from '@/features/assinatura/queries';
import { ehErroApp } from '@/lib/erroApp';

const SEM_LEITURA = 'Não foi possível ler esta imagem. Tente outra.';
const SEM_ENVIO = 'Não foi possível salvar a assinatura agora. Tente de novo em instantes.';

/**
 * A troca da assinatura: a imagem escolhida fica em prévia até o coordenador salvar ou cancelar.
 * Cada recusa vira uma mensagem em português.
 */
export function useTrocaDaAssinatura(usuarioId: number) {
  const [nova, setNova] = useState<ImagemPronta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const envio = useEnviarAssinatura(usuarioId);

  const escolher = (arquivo: File) => {
    setErro(null);
    setPreparando(true);
    prepararImagem(arquivo)
      .then(setNova)
      .catch((causa: unknown) => {
        setErro(ehErroApp(causa) ? causa.message : SEM_LEITURA);
      })
      .finally(() => {
        setPreparando(false);
      });
  };

  const salvar = () => {
    if (nova === null) return;
    setErro(null);
    envio.mutate(nova, {
      onSuccess: () => {
        setNova(null);
      },
      onError: (causa) => {
        setErro(ehErroApp(causa) ? causa.message : SEM_ENVIO);
      },
    });
  };

  const cancelar = () => {
    setNova(null);
    setErro(null);
  };

  return {
    nova,
    erro,
    preparando,
    salvando: envio.isPending,
    ocupado: preparando || envio.isPending,
    escolher,
    salvar,
    cancelar,
  };
}
