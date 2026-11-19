import { Camera, ImageUp, Info, Upload } from 'lucide-react';
import { type ChangeEvent, type DragEvent, type Ref, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACEITA = 'image/png,image/jpeg,image/webp';

interface Props {
  aoEscolher: (arquivo: File) => void;
  desabilitado: boolean;
  rotuloDoArquivo: string;
}

/** A área tracejada do protótipo: soltar a imagem ou clicar para escolher. */
function AreaDeSoltar({
  aoEscolher,
  aoClicar,
  desabilitado,
}: Readonly<{ aoEscolher: (arquivo: File) => void; aoClicar: () => void; desabilitado: boolean }>) {
  const [sobre, setSobre] = useState(false);
  const soltar = (evento: DragEvent) => {
    evento.preventDefault();
    setSobre(false);
    const solto = evento.dataTransfer.files[0];
    if (solto !== undefined && !desabilitado) aoEscolher(solto);
  };
  return (
    <div
      onDragOver={(evento) => {
        evento.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => {
        setSobre(false);
      }}
      onDrop={soltar}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed px-4 py-5 text-center transition-colors duration-150',
        sobre ? 'border-azul bg-info-soft' : 'border-azul/40 bg-superficie-2',
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-[50px] place-items-center rounded-[14px] bg-azul text-white"
      >
        <ImageUp className="size-[22px]" />
      </span>
      <p className="font-bold text-marinho">
        Solte aqui a imagem ou{' '}
        <button
          type="button"
          disabled={desabilitado}
          onClick={aoClicar}
          className="rounded-sm font-bold text-azul foco-anel hover:underline"
        >
          escolha o arquivo
        </button>
      </p>
      <p className="text-[0.8125rem] text-apagado">PNG, JPEG ou WebP, assinatura em papel branco</p>
    </div>
  );
}

/** O campo de arquivo escondido; os botões visíveis abrem ele. */
function Entrada({
  ref,
  rotulo,
  aoMudar,
  camera = false,
}: Readonly<{
  ref: Ref<HTMLInputElement>;
  rotulo: string;
  aoMudar: (evento: ChangeEvent<HTMLInputElement>) => void;
  camera?: boolean;
}>) {
  return (
    <input
      ref={ref}
      type="file"
      accept={ACEITA}
      {...(camera && { capture: 'environment' as const })}
      aria-label={rotulo}
      tabIndex={-1}
      className="sr-only"
      onChange={aoMudar}
    />
  );
}

const NOTA = (
  <p className="flex items-start gap-2 text-[0.8125rem] text-apagado">
    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
    No celular, “Tirar foto” abre a câmera. No computador, abre a escolha de arquivo.
  </p>
);

/**
 * Os jeitos de trazer a imagem: soltar, escolher um arquivo ou tirar a foto. No computador,
 * "Tirar foto" abre a escolha de arquivo, como o navegador faz.
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
    <div className="flex flex-col gap-3">
      <AreaDeSoltar
        aoEscolher={aoEscolher}
        aoClicar={() => arquivo.current?.click()}
        desabilitado={desabilitado}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          disabled={desabilitado}
          onClick={() => arquivo.current?.click()}
        >
          <Upload aria-hidden="true" />
          {rotuloDoArquivo}
        </Button>
        <Button variant="secondary" disabled={desabilitado} onClick={() => camera.current?.click()}>
          <Camera aria-hidden="true" />
          Tirar foto
        </Button>
      </div>
      {NOTA}
      <Entrada ref={arquivo} rotulo="Imagem da assinatura" aoMudar={escolher} />
      <Entrada ref={camera} rotulo="Foto da assinatura" aoMudar={escolher} camera />
    </div>
  );
}
