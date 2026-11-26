import { Situacao } from '@/components/Situacao';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { BaixarPdf } from '@/features/arquivo-do-mes/components/BaixarPdf';
import { EvolucoesDoArquivo } from '@/features/arquivo-do-mes/components/EvolucoesDoArquivo';
import { evolucoes, nomeDaCarteira, textoDoAndamento } from '@/features/arquivo-do-mes/logica';
import { dataEHora } from '@/utils/textos';

interface Props {
  carteira: CarteiraDoMes;
  /** "Recebido" para contas médicas; "Enviado" para a coordenação geral. */
  rotuloDoEnviado: string;
  mes: string;
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

/** A barrinha do protótipo: quantas evoluções da carteira estão concluídas (some no celular). */
function Andamento({ carteira }: Readonly<{ carteira: CarteiraDoMes }>) {
  const total = Math.max(carteira.assistidos, 1);
  const feitas = carteira.arquivo?.evolucoes ?? carteira.concluidas;
  return (
    <span aria-hidden="true" className="hidden items-center gap-2.5 min-[861px]:flex">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-neutro-suave">
        <span
          className="block h-full rounded-full bg-azul"
          style={{ width: `${String(Math.min(100, (feitas / total) * 100))}%` }}
        />
      </span>
      <span className="text-[0.8125rem] font-extrabold text-marinho num">
        {feitas}/{carteira.assistidos}
      </span>
    </span>
  );
}

/** Uma carteira na lista de arquivos: a unidade e o turno, quem envia, o andamento e a situação. */
export function LinhaDoArquivo(props: Readonly<Props>) {
  const { carteira } = props;
  const situacao = situacaoDe(props);
  return (
    <li className="flex flex-col gap-1 border-b border-borda px-4 py-[13px] last:border-b-0 min-[861px]:px-[22px]">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 min-[861px]:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_auto]">
        <span
          aria-hidden="true"
          className="grid h-8 min-w-11 place-items-center rounded-full bg-info-soft px-2 text-xs font-extrabold text-azul-escuro"
        >
          {carteira.unidadeSigla}
        </span>
        <span className="flex min-w-0 flex-col">
          <b className="truncate text-[0.90625rem] leading-tight font-extrabold text-marinho">
            {nomeDaCarteira(carteira)}
          </b>
          <span className="text-[0.78rem] font-semibold text-apagado">{detalheDe(props)}</span>
        </span>
        <Andamento carteira={carteira} />
        <Situacao rotulo={situacao.rotulo} tom={situacao.tom} pequena />
      </div>
      {carteira.arquivo !== null && (
        <div className="flex flex-col gap-1 sm:pl-14">
          <BaixarPdf
            carteiraId={carteira.carteiraId}
            mes={props.mes}
            rotulo="Baixar PDF"
            tamanho="sm"
          />
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
