import { Camera, ImageUp } from 'lucide-react';
import { type ChangeEvent, useRef } from 'react';

import { Button } from '@/components/ui/button';

const ACEITA = 'image/png,image/jpeg,image/webp';

interface Props {
  aoEscolher: (arquivo: File) => void;
  desabilitado: boolean;
  rotuloDoArquivo: string;
}

/**
 * Os dois jeitos de trazer a imagem: escolher um arquivo ou tirar a foto. No computador, "Tirar
 * foto" abre a escolha de arquivo, como o navegador faz.
 */
export function EscolhaDaImagem({ aoEscolher, desabilitado, rotuloDoArquivo }: Readonly<Props>) {
  const arquivo = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const escolher = (evento: ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';
    if (escolhido !== undefined) aoEscolher(escolhido);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={desabilitado} onClick={() => arquivo.current?.click()}>
        <ImageUp aria-hidden="true" />
        {rotuloDoArquivo}
      </Button>
      <Button variant="secondary" disabled={desabilitado} onClick={() => camera.current?.click()}>
        <Camera aria-hidden="true" />
        Tirar foto
      </Button>
      <input
        ref={arquivo}
        type="file"
        accept={ACEITA}
        aria-label="Imagem da assinatura"
        tabIndex={-1}
        className="sr-only"
        onChange={escolher}
      />
      <input
        ref={camera}
        type="file"
        accept={ACEITA}
        capture="environment"
        aria-label="Foto da assinatura"
        tabIndex={-1}
        className="sr-only"
        onChange={escolher}
      />
    </div>
  );
}
