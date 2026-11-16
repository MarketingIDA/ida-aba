import { Button } from '@/components/ui/button';
import type { ResumoDaSincronizacao } from '@/features/cadastros/api/tita.api';
import { contar } from '@/features/cadastros/tita';

interface Props {
  resumo: ResumoDaSincronizacao;
  gravando: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/** Ao abrir a prévia, o foco vai para ela: o botão que a abriu sai da tela. */
const focar = (elemento: HTMLElement | null) => {
  elemento?.focus();
};

/** O segundo passo: os números da simulação, e os botões de gravar e de desistir. */
export function PreviaDaSincronizacao({
  resumo,
  gravando,
  aoConfirmar,
  aoCancelar,
}: Readonly<Props>) {
  return (
    <div
      ref={focar}
      tabIndex={-1}
      role="group"
      aria-label="Confirmar a sincronização"
      className="flex flex-col gap-3 rounded-xl border border-alerta-border bg-alerta-soft p-4 outline-none"
    >
      <p className="text-sm text-alerta-text">
        <b>A Tita mandou {contar(resumo.recebidos, 'favorecido', 'favorecidos')}.</b> Se confirmar:{' '}
        {contar(resumo.criados, 'entra', 'entram')} como rascunho, sem carteira;{' '}
        {contar(resumo.ligados, 'se liga', 'se ligam')} a cadastros que já existem;{' '}
        {contar(resumo.atualizados, 'é atualizado', 'são atualizados')};{' '}
        {contar(resumo.ignorados, 'fica', 'ficam')} de fora (da matriz ou inativos na Tita). Ficam{' '}
        {contar(resumo.pendencias, 'pendência', 'pendências')}. Nada se apaga.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={gravando} onClick={aoConfirmar}>
          {gravando ? 'Sincronizando…' : 'Confirmar a sincronização'}
        </Button>
        <Button variant="ghost" disabled={gravando} onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
