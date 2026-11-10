import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { CorpoDoFormulario } from '@/features/cadastros/components/CamposDoFormulario';

interface Props {
  semUnidade: boolean;
  semCoordenacao: boolean;
  aoFechar: () => void;
}

const CLASSE_DO_LINK =
  'font-bold text-azul-escuro underline underline-offset-2 foco-anel hover:text-marinho';

/**
 * Antes da carteira vêm a unidade ativa e alguém ativo com o papel de coordenação de unidade.
 * Faltando um dos dois, a gaveta diz o que falta e leva até lá, em vez de um formulário sem saída.
 */
export function FaltaParaACarteira({ semUnidade, semCoordenacao, aoFechar }: Readonly<Props>) {
  return (
    <>
      <CorpoDoFormulario>
        <div className="flex flex-col gap-2 rounded-md border border-l-[6px] border-alerta-border border-l-alerta bg-alerta-soft p-3 text-sm font-semibold text-alerta-text">
          <p className="font-bold">Falta cadastro para criar uma carteira.</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {semUnidade && (
              <li>
                Nenhuma unidade ativa.{' '}
                <Link to="/cadastros/unidades" onClick={aoFechar} className={CLASSE_DO_LINK}>
                  Ir para Unidades
                </Link>
              </li>
            )}
            {semCoordenacao && (
              <li>
                Ninguém ativo com o papel de coordenação de unidade.{' '}
                <Link to="/cadastros/pessoas" onClick={aoFechar} className={CLASSE_DO_LINK}>
                  Ir para Pessoas
                </Link>
              </li>
            )}
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
