import { useState } from 'react';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ContadorDeMetas } from '@/features/evolucoes/components/Contadores';
import { FormularioDaParte } from '@/features/evolucoes/components/FormularioDaParte';
import { FRASE_PADRAO, MAXIMO_DA_META, MAXIMO_DE_METAS, metasDoTexto } from '@dominio/evolucao.ts';

/** Partes 3 e 4 na leitura; a 4 começa com a frase padrão (E12). */
export function MetasDaParte({
  metas,
  doMes,
}: Readonly<{ metas: readonly string[]; doMes: boolean }>) {
  return (
    <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-texto">
      {doMes && <p className="max-w-[75ch]">{FRASE_PADRAO}</p>}
      {metas.length === 0 ? (
        <p className="text-apagado">Nenhuma meta escrita ainda.</p>
      ) : (
        <ul className="flex max-w-[75ch] list-disc flex-col gap-1 pl-5 marker:text-azul">
          {metas.map((meta, i) => (
            // Metas podem se repetir; a posição é a identidade dentro da versão.
            <li key={`${String(i)}-${meta}`}>{meta}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** O motivo de não gravar as metas, ou `null`. O banco recusa o mesmo. */
function problemaDasMetas(metas: readonly string[]): string | null {
  if (metas.length > MAXIMO_DE_METAS) {
    return `São ${String(metas.length)} metas; o máximo é ${String(MAXIMO_DE_METAS)}.`;
  }
  const longa = metas.findIndex((m) => m.length > MAXIMO_DA_META);
  if (longa >= 0) {
    return `A meta da linha ${String(longa + 1)} passa de ${String(MAXIMO_DA_META)} caracteres.`;
  }
  return null;
}

interface PropsDaEdicao {
  id: string;
  inicial: readonly string[];
  doMes: boolean;
  salvando: boolean;
  erro: string | null;
  aoSalvar: (metas: string[]) => void;
  aoCancelar: () => void;
}

/** Partes 3 e 4 na edição: uma meta por linha. */
export function EdicaoDasMetas(props: Readonly<PropsDaEdicao>) {
  const { id, inicial, doMes, salvando, erro, aoSalvar, aoCancelar } = props;
  const [texto, setTexto] = useState(inicial.join('\n'));
  const [problema, setProblema] = useState<string | null>(null);
  const metas = metasDoTexto(texto);
  return (
    <FormularioDaParte
      rotulo="Salvar as metas"
      salvando={salvando}
      erro={problema ?? erro}
      aoSalvar={() => {
        const motivo = problemaDasMetas(metas);
        setProblema(motivo);
        if (motivo === null) aoSalvar(metas);
      }}
      aoCancelar={aoCancelar}
      contador={<ContadorDeMetas metas={metas.length} doMes={doMes} />}
    >
      {doMes && <p className="max-w-[75ch] text-sm text-texto-2">{FRASE_PADRAO}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>Metas</Label>
        <Textarea
          id={id}
          aria-describedby={`${id}-dica`}
          rows={6}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
          }}
        />
        <p id={`${id}-dica`} className="text-xs font-semibold text-apagado">
          Uma meta por linha.
        </p>
      </div>
    </FormularioDaParte>
  );
}
