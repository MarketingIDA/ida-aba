import type { Evento } from '@/features/auditoria/api/auditoria.api';
import { descreverEvento, formatarQuando, valorLegivel } from '@/features/auditoria/textos';

/** Campos que entram no detalhe: os que mudaram ou, na criação e na exclusão, todos. */
function camposDoDetalhe(evento: Evento): string[] {
  if (evento.operacao === 'U') return evento.camposAlterados;
  return Object.keys(evento.depois ?? evento.antes ?? {});
}

function TabelaDeCampos({ evento }: Readonly<{ evento: Evento }>) {
  const campos = camposDoDetalhe(evento);
  if (campos.length === 0) return null;
  return (
    <table className="mt-2 w-full table-fixed text-left text-caption">
      <thead className="text-texto-2">
        <tr>
          <th className="w-1/4 py-1 pr-2 font-bold">Campo</th>
          {evento.operacao !== 'I' && <th className="py-1 pr-2 font-bold">Antes</th>}
          {evento.operacao !== 'D' && <th className="py-1 font-bold">Depois</th>}
        </tr>
      </thead>
      <tbody>
        {campos.map((campo) => (
          <tr key={campo} className="border-t border-borda align-top">
            <td className="py-1 pr-2 font-semibold break-words">{campo}</td>
            {evento.operacao !== 'I' && (
              <td className="py-1 pr-2 break-words">{valorLegivel(evento.antes?.[campo])}</td>
            )}
            {evento.operacao !== 'D' && (
              <td className="py-1 break-words">{valorLegivel(evento.depois?.[campo])}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Detalhe({ evento }: Readonly<{ evento: Evento }>) {
  if (evento.operacao === 'A') {
    const detalhes = Object.entries(evento.detalhes ?? {});
    if (detalhes.length === 0) return null;
    return (
      <p className="mt-1 text-caption break-words text-texto-2">
        {detalhes.map(([k, v]) => `${k}: ${valorLegivel(v)}`).join(' · ')}
      </p>
    );
  }
  if (evento.resumido) {
    return (
      <p className="mt-1 text-caption text-texto-2">
        {evento.camposAlterados.length > 0 ? `Campos: ${evento.camposAlterados.join(', ')}. ` : ''}O
        conteúdo não é copiado para a auditoria: fica no próprio registro.
      </p>
    );
  }
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-caption font-bold text-azul">
        {evento.operacao === 'U'
          ? `Ver o que mudou (${String(evento.camposAlterados.length)})`
          : 'Ver os dados'}
      </summary>
      <TabelaDeCampos evento={evento} />
    </details>
  );
}

/** Uma linha da trilha: quando, quem, o quê, em qual registro e o detalhe. */
export function LinhaDoEvento({ evento }: Readonly<{ evento: Evento }>) {
  return (
    <li className="border-b border-borda px-5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-bold text-texto">{descreverEvento(evento)}</span>
        {evento.registroId !== null && evento.tabela !== 'sessions' && (
          <span className="text-caption text-texto-2">registro {evento.registroId}</span>
        )}
      </div>
      <p className="text-caption text-texto-2">
        <time dateTime={evento.ocorridoEm}>{formatarQuando(evento.ocorridoEm)}</time> ·{' '}
        {evento.usuarioNome ?? 'Sistema'}
      </p>
      <Detalhe evento={evento} />
    </li>
  );
}
