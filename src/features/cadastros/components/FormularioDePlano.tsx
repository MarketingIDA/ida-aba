import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { Plano } from '@/features/cadastros/api/cadastros.api';
import {
  CaixaDeAtivo,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { esquemaPlano } from '@/features/cadastros/esquemas';

interface Props {
  /** `null`: cadastro de um plano novo. */
  plano: Plano | null;
  aoSalvar: (valores: Omit<Plano, 'id'>) => Promise<unknown>;
  aoCancelar: () => void;
}

/** Nome do plano e, na alteração, se ele continua ativo. */
export function FormularioDePlano({ plano, aoSalvar, aoCancelar }: Readonly<Props>) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaPlano),
    defaultValues: { nome: plano?.nome ?? '', ativo: plano?.ativo ?? true },
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
        <CampoDeTexto
          id="plano-nome"
          rotulo="Nome do plano"
          dica="Como aparece na evolução e no arquivo do mês."
          erro={errors.nome?.message}
          autoComplete="off"
          {...register('nome')}
        />
        {plano !== null && (
          <CaixaDeAtivo
            rotulo="Plano ativo"
            dica="Desativado, ele sai da escolha do plano do assistido. Quem já tem o plano continua com ele."
            {...register('ativo')}
          />
        )}
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo={plano === null ? 'Cadastrar plano' : 'Salvar alterações'}
        enviando={isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
