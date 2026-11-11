import { FUSO_DA_CLINICA } from '@dominio/mes.ts';

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DA_CLINICA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "11/11/2026 às 14:32", no horário da clínica. */
export function dataEHora(instante: string): string {
  const partes = new Map(
    DATA_HORA.formatToParts(new Date(instante)).map((p) => [p.type, p.value] as const),
  );
  const de = (tipo: Intl.DateTimeFormatPartTypes) => partes.get(tipo) ?? '';
  return `${de('day')}/${de('month')}/${de('year')} às ${de('hour')}:${de('minute')}`;
}

interface Props {
  endereco: string;
  nome: string;
  crp: string | null;
  titulo: string;
  legenda: string;
}

/** A assinatura como sai no fim do arquivo do mês: a imagem, o traço, o nome e o CRP. */
export function PreviaDaAssinatura({ endereco, nome, crp, titulo, legenda }: Readonly<Props>) {
  return (
    <figure className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 shadow-md sm:p-6">
      <figcaption className="flex flex-col gap-0.5">
        <span className="font-display text-lg font-bold text-marinho">{titulo}</span>
        <span className="text-sm text-texto-2">{legenda}</span>
      </figcaption>
      <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-borda-forte bg-white px-4 pt-4 pb-3 text-center text-sm text-texto">
        <img
          src={endereco}
          alt={`Assinatura de ${nome}`}
          className="max-h-28 w-auto max-w-full object-contain"
        />
        <span aria-hidden="true" className="mt-1 h-px w-56 max-w-full bg-texto" />
        <span className="font-bold">{nome}</span>
        <span>{crp === null ? 'CRP não cadastrado' : `CRP ${crp}`}</span>
      </div>
    </figure>
  );
}
