import { CircleAlert, CircleCheck } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router';

import { Situacao } from '@/components/Situacao';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
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
  const Icone = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex items-start gap-2.5">
      <Icone
        aria-hidden="true"
        className={cn('mt-0.5 size-[18px] shrink-0', ok ? 'text-ok-ic' : 'text-bloq-ic')}
      />
      <span className="flex flex-col gap-0.5">
        <b className="text-sm text-marinho">
          <span className="sr-only">{ok ? 'Pronto: ' : 'Falta: '}</span>
          {titulo}
        </b>
        <span className="text-caption font-semibold text-texto-2">{children}</span>
      </span>
    </li>
  );
}

function OQueFalta({ carteira }: Readonly<{ carteira: CarteiraDoMes }>) {
  const pendentes = faltam(carteira);
  return (
    <ul aria-label="O que o envio exige" className="flex flex-col gap-3">
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
  return { rotulo: plural(pendencias, 'pendência', 'pendências'), tom: 'alerta' } as const;
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
      <EnvioDoArquivo carteira={carteira} mes={mes} />
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
      className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 shadow-md sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titulo}>{nomeDaCarteira(props.carteira)}</h2>
        <Situacao rotulo={situacao.rotulo} tom={situacao.tom} />
      </header>
      <Corpo {...props} />
    </article>
  );
}
