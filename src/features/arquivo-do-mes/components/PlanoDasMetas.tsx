import { useQuery } from '@tanstack/react-query';

import type { AcaoNaMeta, MudancaNaMeta } from '@/features/arquivo-do-mes/api/arquivos.api';
import { planoDasMetasOptions } from '@/features/arquivo-do-mes/queries';

const ROTULO: Record<AcaoNaMeta, string> = {
  alcancada: 'Passa a alcançada',
  manutencao: 'Passa a em manutenção',
  nova: 'Entra no cadastro, sem programa e com o critério a definir',
  nao_encontrada: 'Alcançada no texto, mas não está no cadastro: nada muda',
};

const ORDEM: readonly AcaoNaMeta[] = ['alcancada', 'manutencao', 'nova', 'nao_encontrada'];

function porAssistido(plano: readonly MudancaNaMeta[]) {
  const grupos = new Map<number, { nome: string; mudancas: MudancaNaMeta[] }>();
  for (const m of plano) {
    const grupo = grupos.get(m.assistidoId) ?? { nome: m.assistido, mudancas: [] };
    grupo.mudancas.push(m);
    grupos.set(m.assistidoId, grupo);
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function Assistido({ nome, mudancas }: Readonly<{ nome: string; mudancas: MudancaNaMeta[] }>) {
  return (
    <li className="flex flex-col gap-1">
      <b className="text-sm text-marinho">{nome}</b>
      {ORDEM.map((acao) => {
        const metas = mudancas.filter((m) => m.acao === acao);
        if (metas.length === 0) return null;
        return (
          <div key={acao} className="text-caption text-texto-2">
            <span className="font-bold">{ROTULO[acao]}:</span>
            <ul className="list-disc pl-5">
              {metas.map((m) => (
                <li key={m.texto}>{m.texto}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </li>
  );
}

/**
 * O que o envio muda no cadastro de metas de cada assistido (E23), antes de confirmar: o envio não
 * tem volta, e o plano terapêutico muda junto.
 */
export function PlanoDasMetas({ carteiraId, mes }: Readonly<{ carteiraId: number; mes: string }>) {
  const plano = useQuery(planoDasMetasOptions(carteiraId, mes));
  return (
    <section aria-labelledby="plano-das-metas" className="flex flex-col gap-2">
      <h3 id="plano-das-metas" className="text-sm font-bold text-alerta-text">
        O cadastro de metas muda junto
      </h3>
      {plano.isPending && <p role="status">Conferindo as metas…</p>}
      {plano.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          Não foi possível conferir o que muda no cadastro de metas. Tente de novo antes de enviar.
        </p>
      )}
      {plano.data?.length === 0 && (
        <p className="text-sm text-texto-2">Nenhuma meta do cadastro muda com este envio.</p>
      )}
      {plano.data !== undefined && plano.data.length > 0 && (
        <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg bg-superficie p-3">
          {porAssistido(plano.data).map((g) => (
            <Assistido key={g.nome} {...g} />
          ))}
        </ul>
      )}
    </section>
  );
}
