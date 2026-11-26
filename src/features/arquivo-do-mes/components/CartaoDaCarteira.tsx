import { Check, CircleX } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router';

import { Situacao } from '@/components/Situacao';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { BaixarPdf } from '@/features/arquivo-do-mes/components/BaixarPdf';
import { EnvioDoArquivo } from '@/features/arquivo-do-mes/components/EnvioDoArquivo';
import { EvolucoesDoArquivo } from '@/features/arquivo-do-mes/components/EvolucoesDoArquivo';
import {
  evolucoes,
  faltam,
  nomeDaCarteira,
  prontoParaEnviar,
  textoDoAndamento,
  textoDoQueFalta,
} from '@/features/arquivo-do-mes/logica';
import { cn } from '@/lib/utils';
import { dataEHora, plural } from '@/utils/textos';
import { nomeDoMes } from '@dominio/mes.ts';

interface Props {
  carteira: CarteiraDoMes;
  mes: string;
  /** Só o mês aberto envia: o banco define o mês do arquivo. */
  aberto: boolean;
}

const LINK = 'rounded-sm font-bold text-azul underline foco-anel';

/** Um item do que o envio exige: o ícone e o texto dizem se está pronto, nunca só a cor. */
function Exigencia({
  ok,
  titulo,
  children,
}: Readonly<{ ok: boolean; titulo: string; children: ReactNode }>) {
  const Icone = ok ? Check : CircleX;
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-[7px]',
          ok ? 'bg-ok-soft text-ok-text' : 'bg-bloq-soft text-bloq-text',
        )}
      >
        <Icone className="size-3.5" strokeWidth={2.4} />
      </span>
      <span className="flex flex-col gap-0.5">
        <b className="text-sm font-bold text-marinho">
          <span className="sr-only">{ok ? 'Pronto: ' : 'Falta: '}</span>
          {titulo}
        </b>
        <span className="text-[0.8125rem] text-texto-2">{children}</span>
      </span>
    </li>
  );
}

function OQueFalta({ carteira }: Readonly<{ carteira: CarteiraDoMes }>) {
  const pendentes = faltam(carteira);
  return (
    <ul aria-label="O que o envio exige" className="flex flex-col gap-3.5">
      <Exigencia
        ok={pendentes === 0 && carteira.concluidas > 0}
        titulo={textoDoAndamento(carteira)}
      >
        {pendentes === 0 ? (
          'Todas entram no arquivo, em ordem alfabética.'
        ) : (
          <>
            Faltam {textoDoQueFalta(carteira)}. O arquivo só vai com a carteira toda.{' '}
            <Link to="/evolucoes" className={LINK}>
              Ver as evoluções
            </Link>
          </>
        )}
      </Exigencia>
      <Exigencia
        ok={carteira.comAssinatura === true}
        titulo={carteira.comAssinatura === true ? 'Assinatura cadastrada' : 'Assinatura'}
      >
        {carteira.comAssinatura === true ? (
          'Vai uma vez, no fim do arquivo.'
        ) : (
          <>
            Sem ela o arquivo não vai.{' '}
            <Link to="/assinatura" className={LINK}>
              Cadastrar a assinatura
            </Link>
          </>
        )}
      </Exigencia>
    </ul>
  );
}

function situacaoDe(carteira: CarteiraDoMes, aberto: boolean) {
  if (carteira.arquivo !== null) return { rotulo: 'Enviado', tom: 'ok' } as const;
  if (!aberto) return { rotulo: 'Não enviado', tom: 'neutro' } as const;
  if (prontoParaEnviar(carteira)) return { rotulo: 'Pronto para enviar', tom: 'info' } as const;
  const pendencias = (faltam(carteira) > 0 ? 1 : 0) + (carteira.comAssinatura === true ? 0 : 1);
  return { rotulo: plural(pendencias, 'pendência', 'pendências'), tom: 'neutro' } as const;
}

function Corpo({ carteira, mes, aberto }: Readonly<Props>) {
  if (carteira.arquivo !== null) {
    return (
      <>
        <p role="status" className="text-sm text-texto-2">
          Enviado a contas médicas em {dataEHora(carteira.arquivo.enviadoEm)}, com{' '}
          {evolucoes(carteira.arquivo.evolucoes)} e a sua assinatura. As evoluções ficaram só para
          leitura.
        </p>
        <BaixarPdf carteiraId={carteira.carteiraId} mes={mes} rotulo="Baixar PDF" />
        <EvolucoesDoArquivo
          arquivoId={carteira.arquivo.id}
          total={carteira.arquivo.evolucoes}
          comLink
        />
      </>
    );
  }
  if (!aberto) {
    return (
      <p className="text-sm text-texto-2">
        O arquivo de {nomeDoMes(mes)} não foi enviado pelo sistema. Só o mês aberto pode ser
        enviado.
      </p>
    );
  }
  return (
    <>
      <OQueFalta carteira={carteira} />
      <div className="flex flex-wrap items-start gap-3">
        <EnvioDoArquivo carteira={carteira} mes={mes} />
        {carteira.concluidas > 0 && (
          <BaixarPdf carteiraId={carteira.carteiraId} mes={mes} rotulo="Baixar a prévia" />
        )}
      </div>
    </>
  );
}

/** O arquivo do mês de uma carteira do coordenador: o que falta, o envio ou o recibo. */
export function CartaoDaCarteira(props: Readonly<Props>) {
  const situacao = situacaoDe(props.carteira, props.aberto);
  const titulo = useId();
  return (
    <article
      aria-labelledby={titulo}
      className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-md"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borda px-5 py-[18px] min-[861px]:px-[22px]">
        <div>
          <h2 id={titulo}>{nomeDaCarteira(props.carteira)}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-texto-2">
            Vai o arquivo do mês inteiro, não cada evolução. Você envia quando a carteira toda
            estiver concluída.
          </p>
        </div>
        <Situacao rotulo={situacao.rotulo} tom={situacao.tom} />
      </header>
      <div className="flex flex-col gap-4 px-5 py-[18px] min-[861px]:px-[22px]">
        <Corpo {...props} />
      </div>
    </article>
  );
}
