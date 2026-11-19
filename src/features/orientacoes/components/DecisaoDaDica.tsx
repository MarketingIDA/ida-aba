import { Check, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  type Dica,
  MAXIMO_DA_ORIENTACAO,
  MINIMO_DA_ORIENTACAO,
} from '@/features/orientacoes/api/orientacoes.api';

interface Props {
  dica: Dica;
  ocupado: boolean;
  aoAprovar: (texto: string) => void;
  aoDescartar: (motivo: string) => void;
}

interface PropsDoFormulario {
  id: string;
  rotulo: string;
  ajuda: string;
  inicial: string;
  /** O mínimo de caracteres para confirmar; 0 quando o texto é opcional. */
  minimo: number;
  maximo: number;
  confirmar: string;
  ocupado: boolean;
  aoConfirmar: (texto: string) => void;
  aoCancelar: () => void;
}

const focar = (campo: HTMLTextAreaElement | null) => {
  campo?.focus();
};

/** Um campo de texto com a ajuda e os botões de confirmar e de desistir. */
function Formulario(props: Readonly<PropsDoFormulario>) {
  const { id, rotulo, ajuda, minimo, maximo, confirmar, ocupado, aoConfirmar, aoCancelar } = props;
  const [texto, setTexto] = useState(props.inicial);
  const curto = texto.trim().length < minimo;
  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!curto) aoConfirmar(texto.trim());
      }}
    >
      <Label htmlFor={id}>{rotulo}</Label>
      <Textarea
        id={id}
        ref={focar}
        rows={3}
        maxLength={maximo}
        value={texto}
        aria-describedby={`${id}-ajuda`}
        onChange={(evento) => {
          setTexto(evento.target.value);
        }}
      />
      <p id={`${id}-ajuda`} className="text-caption font-semibold text-apagado">
        {ajuda}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={ocupado} onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={curto || ocupado}>
          {confirmar}
        </Button>
      </div>
    </form>
  );
}

type Passo = 'aprovar' | 'descartar';

/** Os dois botões da dica pendente; cada um abre o seu campo. */
function Botoes({
  dica,
  ocupado,
  aoAbrir,
}: Readonly<{ dica: Dica; ocupado: boolean; aoAbrir: (passo: Passo) => void }>) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={ocupado}
        aria-label={`Descartar a dica ${String(dica.id)}`}
        onClick={() => {
          aoAbrir('descartar');
        }}
      >
        <X aria-hidden="true" />
        Descartar
      </Button>
      <Button
        size="sm"
        disabled={ocupado}
        aria-label={`Aprovar a dica ${String(dica.id)}`}
        onClick={() => {
          aoAbrir('aprovar');
        }}
      >
        <Check aria-hidden="true" />
        Aprovar
      </Button>
    </div>
  );
}

/**
 * A decisão de uma dica pendente (E22): aprovar, com a redação ajustada, ou descartar, com o
 * motivo opcional. Cada botão abre o seu campo ali mesmo.
 */
export function DecisaoDaDica({ dica, ocupado, aoAprovar, aoDescartar }: Readonly<Props>) {
  const [aberto, setAberto] = useState<Passo | null>(null);
  const fechar = () => {
    setAberto(null);
  };
  if (aberto === 'aprovar') {
    return (
      <Formulario
        id={`orientacao-${String(dica.id)}`}
        rotulo="Orientação para a IA"
        ajuda={`É o texto que a IA lê antes de todas as evoluções. Ajuste a redação e confira que não cita nenhum assistido. De ${String(MINIMO_DA_ORIENTACAO)} a ${String(MAXIMO_DA_ORIENTACAO)} caracteres.`}
        inicial={dica.dica.slice(0, MAXIMO_DA_ORIENTACAO)}
        minimo={MINIMO_DA_ORIENTACAO}
        maximo={MAXIMO_DA_ORIENTACAO}
        confirmar="Aprovar como orientação"
        ocupado={ocupado}
        aoConfirmar={aoAprovar}
        aoCancelar={fechar}
      />
    );
  }
  if (aberto === 'descartar') {
    return (
      <Formulario
        id={`motivo-${String(dica.id)}`}
        rotulo="Motivo do descarte (opcional)"
        ajuda="A dica descartada fica só no registro; a IA não a lê."
        inicial=""
        minimo={0}
        maximo={500}
        confirmar="Descartar dica"
        ocupado={ocupado}
        aoConfirmar={aoDescartar}
        aoCancelar={fechar}
      />
    );
  }
  return <Botoes dica={dica} ocupado={ocupado} aoAbrir={setAberto} />;
}
