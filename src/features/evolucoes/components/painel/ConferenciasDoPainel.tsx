import { ArrowDown, Check, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Evolucao, NumeroDaParte } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import { CienciaDosAlertas } from '@/features/evolucoes/components/CienciaDosAlertas';
import {
  alertasDoTita,
  type Conferencia,
} from '@/features/evolucoes/components/painel/conferencias';
import { Nota, Pendencia } from '@/features/evolucoes/components/painel/Pendencia';
import { NUMEROS, TITULO_DA_PARTE } from '@/features/evolucoes/conferencia';
import { plural } from '@/features/evolucoes/logica';
import { irParaParte } from '@/features/evolucoes/resumo';

interface Props {
  evolucao: Evolucao;
  importacao: Importacao | null;
  abertas: readonly Conferencia[];
}

function IrParaParte({ numero }: Readonly<{ numero: NumeroDaParte }>) {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        irParaParte(numero);
      }}
    >
      <ArrowDown aria-hidden="true" />
      Ir para a parte {numero}
    </Button>
  );
}

/** Os alertas do PDF do Tita com ciência, recolhidos, com quem deu e quando. */
function AlertasComCiencia({
  evolucao,
  importacao,
}: Readonly<{ evolucao: Evolucao; importacao: Importacao }>) {
  const alertas = alertasDoTita(importacao, evolucao);
  if (alertas.length === 0 || importacao.ciencia === null) return null;
  return (
    <details className="group rounded-[18px] border border-borda bg-superficie">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[18px] px-4 py-3 text-[0.84375rem] font-extrabold text-marinho foco-anel">
        <Check aria-hidden="true" className="size-4" />
        {plural(alertas.length, 'alerta com ciência', 'alertas com ciência')}
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="flex flex-col gap-2 px-4 pb-3">
        {alertas.map((texto) => (
          <li
            key={texto}
            className="border-l-2 border-ok-border pl-3 text-xs font-semibold text-texto-2"
          >
            {texto}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** "Nenhuma conferência aberta", com as partes que ainda faltam marcar. */
function NadaAberto({ faltam }: Readonly<{ faltam: readonly NumeroDaParte[] }>) {
  const partes = faltam.map((n) => `parte ${String(n)}`).join(', ');
  const resto = faltam.length > 0 ? ` Falta marcar como conferida: ${partes}.` : '';
  return <Nota ok>Nenhuma conferência aberta.{resto}</Nota>;
}

/**
 * A aba Conferências: o que está aberto na evolução, bloqueios primeiro, cada um levando à parte; os
 * alertas do PDF do Tita com a ciência (E19); e as partes que faltam conferir.
 */
export function ConferenciasDoPainel({ evolucao, importacao, abertas }: Readonly<Props>) {
  const emConferencia = evolucao.situacao === 'em_conferencia';
  const faltam = emConferencia
    ? NUMEROS.filter((n) => evolucao.partes.some((p) => p.numero === n && p.conferidaEm === null))
    : [];
  const primeira = faltam[0];
  return (
    <div className="flex flex-col gap-2.5">
      {evolucao.situacao === 'enviada' && (
        <Nota ok>Evolução enviada no arquivo do mês. As conferências ficam registradas aqui.</Nota>
      )}
      {evolucao.situacao === 'concluida' && (
        <Nota ok>
          Evolução concluída e no arquivo do mês. Para mudar algo antes do envio, reabra a evolução.
        </Nota>
      )}
      {abertas.length === 0 && <NadaAberto faltam={faltam} />}
      {abertas.length > 0 && (
        <ul aria-label="Conferências abertas" className="flex flex-col gap-2.5">
          {abertas.map((c) => (
            <Pendencia key={`${c.rotulo}-${c.texto}`} tom={c.tom} rotulo={c.rotulo} texto={c.texto}>
              {c.parte !== null && <IrParaParte numero={c.parte} />}
            </Pendencia>
          ))}
          {primeira !== undefined && (
            <Pendencia
              tom="info"
              texto={plural(faltam.length, 'parte a conferir', 'partes a conferir')}
              detalhe={faltam.map((n) => `${String(n)}. ${TITULO_DA_PARTE[n]}`).join(' · ')}
            >
              <IrParaParte numero={primeira} />
            </Pendencia>
          )}
        </ul>
      )}
      {importacao !== null && (
        <CienciaDosAlertas
          evolucao={evolucao}
          importacao={importacao}
          alertas={alertasDoTita(importacao, evolucao).length}
        />
      )}
      {importacao !== null && <AlertasComCiencia evolucao={evolucao} importacao={importacao} />}
    </div>
  );
}
