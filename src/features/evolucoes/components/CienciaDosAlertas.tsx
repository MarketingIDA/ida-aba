import { CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import { useDarCiencia } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';
import { dataEHora } from '@/utils/textos';

interface Props {
  evolucao: Evolucao;
  importacao: Importacao;
  alertas: number;
}

/**
 * A ciência dos alertas da importação (E19, P16): até o coordenador dar ciência, os alertas seguem
 * nas conferências da evolução. Não impede a conclusão; fica registrado quem deu e quando.
 */
export function CienciaDosAlertas({ evolucao, importacao, alertas }: Readonly<Props>) {
  const dar = useDarCiencia(evolucao.id);
  if (alertas === 0) return null;
  if (importacao.ciencia !== null) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-ok-text">
        <CheckCheck aria-hidden="true" className="size-4 shrink-0" />
        Ciência dos alertas dada por {importacao.ciencia.por} em {dataEHora(importacao.ciencia.em)}.
      </p>
    );
  }
  if (!evolucao.editavel || evolucao.situacao !== 'em_conferencia') return null;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="secondary"
        disabled={dar.isPending}
        onClick={() => {
          dar.mutate(importacao.id);
        }}
      >
        <CheckCheck aria-hidden="true" />
        {dar.isPending ? 'Gravando…' : 'Dar ciência dos alertas'}
      </Button>
      {dar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(dar.error) ? dar.error.message : 'Não foi possível gravar a ciência.'}
        </p>
      )}
    </div>
  );
}
