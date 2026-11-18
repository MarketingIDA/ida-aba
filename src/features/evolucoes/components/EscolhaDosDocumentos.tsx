import { Camera, FileUp, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { ACEITOS, ACEITOS_DA_FOTO } from '@/features/evolucoes/documentos/lerDocumento';
import type { OutrosDocumentos as Estado } from '@/features/evolucoes/routes/useOutrosDocumentos';

/** Um botão que abre a escolha de arquivos; o `input` fica fora da tela, com rótulo para leitores. */
function BotaoDeArquivo({
  rotulo,
  rotuloDoCampo,
  icone: Icone,
  aceita,
  camera = false,
  estado,
}: Readonly<{
  rotulo: string;
  rotuloDoCampo: string;
  icone: LucideIcon;
  aceita: string;
  camera?: boolean;
  estado: Estado;
}>) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        disabled={estado.ocupado}
        onClick={() => {
          entrada.current?.click();
        }}
      >
        <Icone aria-hidden="true" />
        {rotulo}
      </Button>
      <input
        ref={entrada}
        type="file"
        multiple={!camera}
        capture={camera ? 'environment' : undefined}
        accept={aceita}
        aria-label={rotuloDoCampo}
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => {
          const arquivos = [...(evento.target.files ?? [])];
          evento.target.value = '';
          if (arquivos.length > 0) estado.escolher(arquivos);
        }}
      />
    </>
  );
}

/** Juntar arquivos (PDF, Word ou imagem) ou tirar a foto do papel pela câmera do celular. */
export function EscolhaDosDocumentos({ estado }: Readonly<{ estado: Estado }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <BotaoDeArquivo
          rotulo={estado.lendo ? 'Lendo os documentos…' : 'Juntar documentos'}
          rotuloDoCampo="Outros documentos"
          icone={FileUp}
          aceita={ACEITOS}
          estado={estado}
        />
        <BotaoDeArquivo
          rotulo="Tirar foto"
          rotuloDoCampo="Foto do documento"
          icone={Camera}
          aceita={ACEITOS_DA_FOTO}
          camera
          estado={estado}
        />
      </div>
      <p className="text-sm text-apagado">
        PDF, Word (.docx) ou foto (JPG ou PNG), vários de uma vez. A foto é lida neste computador e
        pode levar até um minuto; papel reto, sem sombra e com boa luz lê melhor.
      </p>
    </div>
  );
}
