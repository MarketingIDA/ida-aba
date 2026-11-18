import { useMutation } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { enviarDica, MAXIMO_DA_DICA, MINIMO_DA_DICA } from '@/features/evolucoes/api/dicas.api';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { ehErroApp } from '@/lib/erroApp';
import { ROTULO_DO_CAMPO } from '@/utils/camposDaIA';
import { trocarNome } from '@dominio/pseudonimo.ts';
import type { CampoDaIA } from '@dominio/rascunho.ts';

interface Props {
  evolucao: Evolucao;
  campo: CampoDaIA;
}

interface PropsDoFormulario {
  campo: CampoDaIA;
  enviando: boolean;
  erro: string | null;
  aoEnviar: (dica: string) => void;
  aoCancelar: () => void;
}

const focar = (campo: HTMLTextAreaElement | null) => {
  campo?.focus();
};

/** O campo da dica, com o mínimo que o banco exige, e os botões de enviar e de desistir. */
function Formulario({ campo, enviando, erro, aoEnviar, aoCancelar }: Readonly<PropsDoFormulario>) {
  const [dica, setDica] = useState('');
  const curta = dica.trim().length < MINIMO_DA_DICA;
  const id = `dica-${campo}`;
  return (
    <form
      noValidate
      className="flex max-w-[75ch] flex-col gap-2 rounded-lg border border-borda bg-neutro-suave p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!curta) aoEnviar(dica.trim());
      }}
    >
      <Label htmlFor={id}>O que a IA deve fazer diferente em “{ROTULO_DO_CAMPO[campo]}”?</Label>
      <Textarea
        id={id}
        ref={focar}
        rows={3}
        maxLength={MAXIMO_DA_DICA}
        value={dica}
        aria-describedby={`${id}-ajuda`}
        onChange={(evento) => {
          setDica(evento.target.value);
        }}
      />
      <p id={`${id}-ajuda`} className="text-caption font-semibold text-apagado">
        A dica vai para a coordenação geral, que decide se ela vira orientação para todas as
        evoluções. Ela não muda este texto, e o nome do assistido sai dela antes de gravar.
      </p>
      {erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={enviando} onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={curta || enviando}>
          {enviando ? 'Enviando…' : 'Enviar dica'}
        </Button>
      </div>
    </form>
  );
}

const mensagem = (erro: unknown) =>
  ehErroApp(erro) ? erro.message : 'Não foi possível enviar a dica agora.';

/**
 * Dica para a IA (E21), num bloco que ela escreveu: o coordenador diz o que a IA deve fazer
 * diferente. O nome do assistido sai da dica aqui, com a mesma troca do rascunho (E05).
 */
export function DicaParaAIA({ evolucao, campo }: Readonly<Props>) {
  const [aberta, setAberta] = useState(false);
  const enviar = useMutation({
    mutationFn: (dica: string) =>
      // Sem o gênero (a leitura antiga da evolução não manda), o nome sai do mesmo jeito.
      enviarDica(
        evolucao.id,
        campo,
        trocarNome(dica, evolucao.assistido, evolucao.genero ?? 'masculino').texto,
      ),
    onSuccess: () => {
      setAberta(false);
    },
  });

  if (aberta) {
    return (
      <Formulario
        campo={campo}
        enviando={enviar.isPending}
        erro={enviar.isError ? mensagem(enviar.error) : null}
        aoEnviar={enviar.mutate}
        aoCancelar={() => {
          enviar.reset();
          setAberta(false);
        }}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="link"
        aria-label={`Dica para a IA sobre ${ROTULO_DO_CAMPO[campo]}`}
        onClick={() => {
          enviar.reset();
          setAberta(true);
        }}
      >
        <Lightbulb aria-hidden="true" className="size-3.5" />
        Dica para a IA
      </Button>
      {enviar.isSuccess && (
        <span role="status" className="text-caption font-bold text-ok-text">
          Dica enviada à coordenação geral.
        </span>
      )}
    </div>
  );
}
