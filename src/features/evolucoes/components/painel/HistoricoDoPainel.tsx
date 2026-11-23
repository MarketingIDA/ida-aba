import { useQueries } from '@tanstack/react-query';
import { Lock, Pencil, Sparkles } from 'lucide-react';

import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { historicoOptions } from '@/features/evolucoes/api/historico.api';
import { Rotulo } from '@/features/evolucoes/components/painel/Pendencia';
import { dataEHora } from '@/utils/textos';

interface Acontecimento {
  texto: string;
  quando: string;
}

/** O que aconteceu com a evolução e o banco guarda: devoluções, resoluções e a conclusão. */
function acontecimentos(evolucao: Evolucao): Acontecimento[] {
  const lista: Acontecimento[] = evolucao.devolucoes.flatMap((d) => [
    { texto: `Devolvida por ${d.devolvidaPor}: “${d.motivo}”`, quando: d.devolvidaEm },
    ...(d.resolvidaEm === null
      ? []
      : [
          {
            texto: `Devolução resolvida por ${d.resolvidaPor ?? 'a coordenação'}`,
            quando: d.resolvidaEm,
          },
        ]),
  ]);
  if (evolucao.concluidaEm !== null) {
    lista.push({ texto: 'Concluída', quando: evolucao.concluidaEm });
  }
  return lista.sort((a, b) => b.quando.localeCompare(a.quando));
}

const PARTES_COM_VERSAO = [2, 3, 4] as const;

function Acontecimentos({ eventos }: Readonly<{ eventos: readonly Acontecimento[] }>) {
  if (eventos.length === 0) return null;
  return (
    <ol aria-label="Acontecimentos" className="flex flex-col gap-2">
      {eventos.map((e) => (
        <li key={`${e.quando}-${e.texto}`} className="border-l-2 border-borda-forte pl-3">
          <b className="block text-[0.84375rem] text-marinho">{e.texto}</b>
          <span className="text-xs font-semibold text-apagado">{dataEHora(e.quando)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A aba Histórico: o que aconteceu com a evolução e as versões guardadas de cada parte, da mais
 * nova à mais antiga (E07). As versões só são buscadas quando a aba abre.
 */
export function HistoricoDoPainel({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const consultas = useQueries({
    queries: PARTES_COM_VERSAO.map((n) => historicoOptions(evolucao.id, n)),
  });
  const versoes = PARTES_COM_VERSAO.flatMap((n, i) =>
    (consultas[i]?.data ?? []).map((v) => ({ ...v, numero: n })),
  ).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const carregando = consultas.some((c) => c.isPending);
  const falhou = consultas.some((c) => c.isError);
  const eventos = acontecimentos(evolucao);
  return (
    <div className="flex flex-col gap-2 rounded-[18px] border border-borda bg-superficie p-4 shadow-sm">
      <Acontecimentos eventos={eventos} />
      <Rotulo>Versões guardadas</Rotulo>
      {carregando && <p className="text-caption text-apagado">Carregando as versões…</p>}
      {falhou && (
        <p role="alert" className="text-caption font-bold text-bloq-text">
          Não foi possível carregar as versões agora.
        </p>
      )}
      {!carregando && !falhou && (
        <ul aria-label="Versões guardadas" className="flex flex-col gap-1.5">
          {versoes.length === 0 && <li className="text-caption text-apagado">Nenhuma versão.</li>}
          {versoes.map((v) => {
            const Icone = v.autor === 'ia' ? Sparkles : Pencil;
            return (
              <li
                key={v.id}
                className="flex items-center gap-2 text-caption font-semibold text-texto-2"
              >
                <Icone aria-hidden="true" className="size-3.5 shrink-0" />
                Parte {v.numero} · {v.autor === 'ia' ? 'IA' : (v.criadoPor ?? 'coordenação')} ·{' '}
                {dataEHora(v.criadoEm)}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-1 flex items-start gap-2 text-caption font-semibold text-apagado">
        <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />O texto da IA nunca é
        apagado: cada edição guarda uma versão nova (E07).
      </p>
    </div>
  );
}
