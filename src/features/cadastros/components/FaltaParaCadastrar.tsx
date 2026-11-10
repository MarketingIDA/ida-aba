import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { CorpoDoFormulario } from '@/features/cadastros/components/CamposDoFormulario';

export interface Falta {
  /** O que falta, em uma frase (ex.: "Nenhuma unidade ativa."). */
  texto: string;
  /** A aba onde se resolve (ex.: `/cadastros/unidades`) e o nome do link. */
  rota: string;
  link: string;
}

interface Props {
  /** O que não dá para cadastrar ainda (ex.: "uma carteira"). */
  oQue: string;
  faltas: readonly Falta[];
  aoFechar: () => void;
}

const CLASSE_DO_LINK =
  'font-bold text-azul-escuro underline underline-offset-2 foco-anel hover:text-marinho';

/**
 * Quando falta um cadastro anterior (a unidade antes da carteira, a carteira antes do
 * assistido), a gaveta diz o que falta e leva até lá, em vez de um formulário sem saída.
 */
export function FaltaParaCadastrar({ oQue, faltas, aoFechar }: Readonly<Props>) {
  return (
    <>
      <CorpoDoFormulario>
        <div className="flex flex-col gap-2 rounded-md border border-l-[6px] border-alerta-border border-l-alerta bg-alerta-soft p-3 text-sm font-semibold text-alerta-text">
          <p className="font-bold">Falta cadastro para criar {oQue}.</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {faltas.map(({ texto, rota, link }) => (
              <li key={rota}>
                {texto}{' '}
                <Link to={rota} onClick={aoFechar} className={CLASSE_DO_LINK}>
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CorpoDoFormulario>
      <div className="mt-auto flex justify-end border-t border-borda px-5 py-4">
        <Button type="button" variant="secondary" onClick={aoFechar}>
          Fechar
        </Button>
      </div>
    </>
  );
}
