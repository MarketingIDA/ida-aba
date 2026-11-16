import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { DadosDoTermo, TermoInadequado } from '@/features/cadastros/api/termos.api';
import {
  CaixaDeAtivo,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { esquemaDoTermo } from '@/features/cadastros/termos';

interface Props {
  /** `null`: termo novo. */
  termo: TermoInadequado | null;
  aoSalvar: (dados: DadosDoTermo) => Promise<unknown>;
  aoCancelar: () => void;
}

const CAMPOS = [
  {
    nome: 'termo',
    rotulo: 'Termo',
    dica: 'A palavra ou expressão que expõe o assistido. Vale sem ligar para maiúscula nem acento.',
  },
  {
    nome: 'substituto',
    rotulo: 'Substituto técnico',
    dica: 'O que entra no lugar do termo quando o coordenador usa a troca na evolução.',
  },
] as const;

/** O termo, o substituto técnico e, na alteração, se ele continua na lista. */
export function FormularioDeTermo({ termo, aoSalvar, aoCancelar }: Readonly<Props>) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaDoTermo),
    defaultValues: {
      termo: termo?.termo ?? '',
      substituto: termo?.substituto ?? '',
      ativo: termo?.ativo ?? true,
    },
  });
  const { erro, enviar } = useEnvio(aoSalvar);
  const { errors, isSubmitting } = formState;

  return (
    <form
      noValidate
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <CorpoDoFormulario>
        {CAMPOS.map(({ nome, rotulo, dica }) => (
          <CampoDeTexto
            key={nome}
            id={`termo-${nome}`}
            rotulo={rotulo}
            dica={dica}
            erro={errors[nome]?.message}
            autoComplete="off"
            {...register(nome)}
          />
        ))}
        {termo !== null && (
          <CaixaDeAtivo
            rotulo="Termo ativo"
            dica="Desativado, ele sai da lista e a evolução deixa de alertar."
            {...register('ativo')}
          />
        )}
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo={termo === null ? 'Incluir termo' : 'Salvar alterações'}
        enviando={isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
