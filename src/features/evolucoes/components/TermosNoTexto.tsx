import { useQuery } from '@tanstack/react-query';
import { Replace, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { termosAtivosOptions } from '@/features/evolucoes/api/termos.api';
import { TextoDaEvolucao } from '@/features/evolucoes/components/TextoDaEvolucao';
import { textoDaEvolucao, type Trecho, type Trechos } from '@dominio/evolucao.ts';
import { type Termo, termosNoTexto, trocarNosTrechos } from '@dominio/termos.ts';

interface Props {
  trechos: Trechos | null;
  /** O coordenador da carteira, com a evolução em conferência e sem outra parte em edição. */
  podeTrocar: boolean;
  ocupado: boolean;
  /** A troca grava uma versão nova do texto, já sem o termo. */
  aoTrocar: (trechos: Trechos) => void;
  /** O que vem logo depois de cada trecho (a dica para a IA, E21). */
  depoisDoTrecho?: ((trecho: Trecho) => ReactNode) | undefined;
}

interface PropsDoAlerta {
  termo: Termo;
  ocupado: boolean;
  /** `undefined`: quem só lê a evolução vê o alerta, sem a troca. */
  aoTrocar: (() => void) | undefined;
}

function Alerta({ termo, ocupado, aoTrocar }: Readonly<PropsDoAlerta>) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-alerta-border bg-alerta-soft px-3.5 py-2.5 text-sm text-alerta-text">
      <span className="flex min-w-0 flex-1 items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <b>Termo inadequado: “{termo.termo}”.</b> A lista da coordenação geral troca por “
          {termo.substituto}”.
        </span>
      </span>
      {aoTrocar !== undefined && (
        <Button
          variant="secondary"
          size="sm"
          disabled={ocupado}
          aria-label={`Trocar “${termo.termo}” por “${termo.substituto}”`}
          onClick={aoTrocar}
        >
          <Replace aria-hidden="true" />
          Trocar
        </Button>
      )}
    </li>
  );
}

/**
 * Parte 2 na leitura, com os termos inadequados (E10): o termo da lista da coordenação geral fica
 * marcado no texto e vira um alerta, com a troca pelo termo técnico em um toque. É alerta, não
 * bloqueio. Sem a lista (ela não carregou), o texto aparece sem marca.
 */
export function TextoComTermos({
  trechos,
  podeTrocar,
  ocupado,
  aoTrocar,
  depoisDoTrecho,
}: Readonly<Props>) {
  const termos = useQuery(termosAtivosOptions()).data ?? [];
  const achados = trechos === null ? [] : termosNoTexto(textoDaEvolucao(trechos), termos);
  return (
    <div className="flex flex-col gap-4">
      <TextoDaEvolucao trechos={trechos} termos={achados} depoisDoTrecho={depoisDoTrecho} />
      {trechos !== null && achados.length > 0 && (
        <ul aria-label="Termos inadequados no texto" className="flex flex-col gap-2">
          {achados.map((termo) => (
            <Alerta
              key={termo.termo}
              termo={termo}
              ocupado={ocupado}
              aoTrocar={
                podeTrocar
                  ? () => {
                      aoTrocar(trocarNosTrechos(trechos, termo));
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
