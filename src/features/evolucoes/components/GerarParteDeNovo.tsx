import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGerarParteDeNovo } from '@/features/evolucoes/queries';
import { ehErroApp } from '@/lib/erroApp';
import { MAXIMO_DA_INSTRUCAO, type ParteDaIA } from '@dominio/parteDeNovo.ts';

interface Props {
  evolucaoId: string;
  numero: ParteDaIA;
  /** Outra parte em edição ou uma gravação em curso. */
  ocupado: boolean;
}

const focar = (campo: HTMLTextAreaElement | null) => {
  campo?.focus();
};

const mensagem = (erro: unknown) =>
  ehErroApp(erro) ? erro.message : 'Não foi possível gerar a parte agora.';

interface PropsDoFormulario {
  numero: ParteDaIA;
  gerar: ReturnType<typeof useGerarParteDeNovo>;
  aoFechar: () => void;
}

/** Gerando, ou a recusa em português. */
function Andamento({ gerar }: Readonly<Pick<PropsDoFormulario, 'gerar'>>) {
  if (gerar.isPending) {
    return (
      <p role="status" className="text-sm text-apagado">
        Pode levar até um minuto. Não feche esta tela.
      </p>
    );
  }
  if (!gerar.isError) return null;
  return (
    <p role="alert" className="text-sm font-bold text-bloq-text">
      {mensagem(gerar.error)}
    </p>
  );
}

/** A instrução, o andamento e os botões de gerar e de desistir. */
function Formulario({ numero, gerar, aoFechar }: Readonly<PropsDoFormulario>) {
  const [instrucao, setInstrucao] = useState('');
  const id = `instrucao-${String(numero)}`;
  const vazia = instrucao.trim() === '';
  return (
    <form
      noValidate
      className="flex max-w-[75ch] flex-col gap-2 rounded-lg border border-borda bg-neutro-suave p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!vazia) gerar.mutate({ numero, instrucao: instrucao.trim() }, { onSuccess: aoFechar });
      }}
    >
      <Label htmlFor={id}>O que a IA deve mudar nesta parte?</Label>
      <Textarea
        id={id}
        ref={focar}
        rows={3}
        maxLength={MAXIMO_DA_INSTRUCAO}
        value={instrucao}
        aria-describedby={`${id}-ajuda`}
        onChange={(evento) => {
          setInstrucao(evento.target.value);
        }}
      />
      <p id={`${id}-ajuda`} className="text-caption font-semibold text-apagado">
        Só esta parte muda e volta para a conferir. O texto atual fica guardado, e a instrução fica
        registrada com a versão nova.
      </p>
      <Andamento gerar={gerar} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={gerar.isPending}
          onClick={aoFechar}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={vazia || gerar.isPending}>
          <Sparkles aria-hidden="true" />
          {gerar.isPending ? 'Gerando…' : 'Gerar de novo'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Gerar esta parte de novo pela IA, com uma instrução (E08): só ela muda, volta para "a conferir",
 * e o texto anterior fica guardado como versão (E07). O nome do assistido sai da instrução antes
 * de ir para a IA, no servidor (E05).
 */
export function GerarParteDeNovo({ evolucaoId, numero, ocupado }: Readonly<Props>) {
  const gerar = useGerarParteDeNovo(evolucaoId);
  const [aberta, setAberta] = useState(false);
  if (aberta) {
    return (
      <Formulario
        numero={numero}
        gerar={gerar}
        aoFechar={() => {
          setAberta(false);
        }}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="link"
        disabled={ocupado}
        onClick={() => {
          gerar.reset();
          setAberta(true);
        }}
      >
        <Sparkles aria-hidden="true" />
        Gerar esta parte de novo com a IA
      </Button>
      {gerar.isSuccess && (
        <p role="status" className="text-caption font-semibold text-ok-text">
          Parte gerada de novo. Confira o texto acima.
        </p>
      )}
    </div>
  );
}
