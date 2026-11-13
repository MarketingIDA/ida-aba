import { Situacao } from '@/components/Situacao';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { EvolucoesDoArquivo } from '@/features/arquivo-do-mes/components/EvolucoesDoArquivo';
import { evolucoes, nomeDaCarteira, textoDoAndamento } from '@/features/arquivo-do-mes/logica';
import { dataEHora } from '@/utils/textos';

interface Props {
  carteira: CarteiraDoMes;
  /** "Recebido" para contas médicas; "Enviado" para a coordenação geral. */
  rotuloDoEnviado: string;
  /** Só o mês aberto ainda espera arquivo. */
  aberto: boolean;
  comLink: boolean;
}

function detalheDe({ carteira, rotuloDoEnviado }: Readonly<Props>): string {
  const andamento =
    carteira.arquivo === null
      ? textoDoAndamento(carteira)
      : `${evolucoes(carteira.arquivo.evolucoes)} · ${rotuloDoEnviado.toLowerCase()} em ${dataEHora(carteira.arquivo.enviadoEm)}`;
  return carteira.coordenador === null ? andamento : `${carteira.coordenador} · ${andamento}`;
}

function situacaoDe({ carteira, rotuloDoEnviado, aberto }: Readonly<Props>) {
  if (carteira.arquivo !== null) return { rotulo: rotuloDoEnviado, tom: 'ok' } as const;
  return aberto
    ? ({ rotulo: 'A chegar', tom: 'alerta' } as const)
    : ({ rotulo: 'Não chegou', tom: 'neutro' } as const);
}

/** Uma carteira na lista de arquivos: a unidade e o turno, quem envia, o andamento e a situação. */
export function LinhaDoArquivo(props: Readonly<Props>) {
  const { carteira } = props;
  const situacao = situacaoDe(props);
  return (
    <li className="flex flex-col gap-1 px-4 py-3 sm:px-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-8 min-w-11 place-items-center rounded-full bg-info-soft px-2 text-xs font-extrabold text-azul-escuro"
        >
          {carteira.unidadeSigla}
        </span>
        <span className="flex min-w-0 flex-col">
          <b className="truncate text-[0.90625rem] leading-tight text-marinho">
            {nomeDaCarteira(carteira)}
          </b>
          <span className="text-caption font-semibold text-apagado">{detalheDe(props)}</span>
        </span>
        <Situacao rotulo={situacao.rotulo} tom={situacao.tom} />
      </div>
      {carteira.arquivo !== null && (
        <div className="sm:pl-14">
          <EvolucoesDoArquivo
            arquivoId={carteira.arquivo.id}
            total={carteira.arquivo.evolucoes}
            comLink={props.comLink}
          />
        </div>
      )}
    </li>
  );
}
