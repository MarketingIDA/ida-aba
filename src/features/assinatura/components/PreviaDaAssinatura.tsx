import { Clock } from 'lucide-react';

interface Props {
  /** Sem imagem: ainda não há assinatura, e a caixa mostra o convite. */
  endereco: string | null;
  nome: string;
  crp: string | null;
  titulo: string;
  legenda: string;
}

/** A coluna "como sai no documento": a imagem, o traço, o nome e o CRP, e quando foi enviada. */
export function PreviaDaAssinatura({ endereco, nome, crp, titulo, legenda }: Readonly<Props>) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3">
      <figcaption className="rotulo text-apagado">{titulo}</figcaption>
      <div className="grid min-h-44 place-items-center rounded-xl border border-borda bg-white px-4 py-5 text-center">
        {endereco === null ? (
          <p className="flex flex-col gap-1">
            <b className="font-display text-base text-marinho">Você ainda não tem assinatura</b>
            <span className="text-sm text-texto-2">
              Envie a imagem da sua assinatura ou do carimbo ao lado.
            </span>
          </p>
        ) : (
          <div className="flex flex-col items-center gap-1 text-[0.8125rem] font-bold text-marinho">
            <img
              src={endereco}
              alt={`Assinatura de ${nome}`}
              className="max-h-24 w-auto max-w-full object-contain"
            />
            <span aria-hidden="true" className="h-px w-56 max-w-full bg-marinho" />
            <span>
              {nome} · <span>{crp === null ? 'CRP não cadastrado' : `CRP ${crp}`}</span>
            </span>
          </div>
        )}
      </div>
      <p className="flex items-center gap-2 text-[0.8125rem] text-apagado">
        <Clock aria-hidden="true" className="size-4 shrink-0" />
        {legenda}
      </p>
    </figure>
  );
}
