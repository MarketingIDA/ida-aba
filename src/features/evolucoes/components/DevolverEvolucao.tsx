import { Undo2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MAXIMO_DO_MOTIVO, MINIMO_DO_MOTIVO } from '@/features/evolucoes/api/devolucao.api';
import { useDevolverEvolucao } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';

/** Ao abrir o formulário, o foco vai para o motivo: o botão que o abriu sai da tela. */
const focar = (campo: HTMLTextAreaElement | null) => {
  campo?.focus();
};

interface PropsDoMotivo {
  enviando: boolean;
  erro: string | null;
  aoDevolver: (motivo: string) => void;
  aoCancelar: () => void;
}

/** O campo do motivo, com o mínimo que o banco exige, e os botões de devolver e de desistir. */
function FormularioDoMotivo({ enviando, erro, aoDevolver, aoCancelar }: Readonly<PropsDoMotivo>) {
  const [motivo, setMotivo] = useState('');
  const curto = motivo.trim().length < MINIMO_DO_MOTIVO;
  return (
    <form
      noValidate
      className="flex basis-full flex-col gap-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!curto) aoDevolver(motivo.trim());
      }}
    >
      <Label htmlFor="motivo-da-devolucao">Motivo da devolução</Label>
      <Textarea
        id="motivo-da-devolucao"
        ref={focar}
        rows={3}
        maxLength={MAXIMO_DO_MOTIVO}
        value={motivo}
        aria-describedby="ajuda-do-motivo"
        onChange={(evento) => {
          setMotivo(evento.target.value);
        }}
      />
      <p id="ajuda-do-motivo" className="text-caption font-semibold text-apagado">
        O coordenador vê o motivo como um bloqueio na evolução, que volta para conferência. Mínimo
        de {MINIMO_DO_MOTIVO} caracteres.
      </p>
      {erro !== null && (
        <p role="alert" className="text-bloq-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" disabled={enviando} onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={curto || enviando}>
          <Undo2 aria-hidden="true" />
          {enviando ? 'Devolvendo…' : 'Devolver'}
        </Button>
      </div>
    </form>
  );
}

const mensagem = (erro: unknown) =>
  ehErroApp(erro) ? erro.message : 'Não foi possível devolver agora. Tente de novo em instantes.';

/**
 * Devolver com motivo (E13), para a coordenação geral, na barra da evolução concluída. O botão
 * abre o campo do motivo ali mesmo: dá para reler o texto da evolução enquanto se escreve.
 */
export function DevolverEvolucao({ evolucaoId }: Readonly<{ evolucaoId: string }>) {
  const devolver = useDevolverEvolucao(evolucaoId);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <Button
        size="lg"
        variant="secondary"
        onClick={() => {
          setAberto(true);
        }}
      >
        <Undo2 aria-hidden="true" />
        Devolver com motivo
      </Button>
    );
  }
  return (
    <FormularioDoMotivo
      enviando={devolver.isPending}
      erro={devolver.isError ? mensagem(devolver.error) : null}
      aoDevolver={devolver.mutate}
      aoCancelar={() => {
        devolver.reset();
        setAberto(false);
      }}
    />
  );
}
