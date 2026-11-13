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
