import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import {
  CaixaDeAtivo,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { esquemaUnidade } from '@/features/cadastros/esquemas';

interface Props {
  /** `null`: cadastro de uma unidade nova. */
  unidade: Unidade | null;
  aoSalvar: (valores: Omit<Unidade, 'id'>) => Promise<unknown>;
  aoCancelar: () => void;
}

const DICA_DA_SIGLA = {
  nova: (
    <>
      De 2 a 5 letras. Começa o código das evoluções da unidade, como{' '}
      <span className="whitespace-nowrap">BOV-2611-001-EV</span>.
    </>
  ),
  edicao: 'Mudar a sigla vale para as evoluções novas; os códigos já dados não mudam.',
};

const valoresIniciais = (unidade: Unidade | null) => ({
  sigla: unidade?.sigla ?? '',
  nome: unidade?.nome ?? '',
  ativa: unidade?.ativa ?? true,
});

/** Sigla, nome e, na alteração, se a unidade continua ativa. */
export function FormularioDeUnidade({ unidade, aoSalvar, aoCancelar }: Readonly<Props>) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaUnidade),
    defaultValues: valoresIniciais(unidade),
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
          id="unidade-sigla"
          rotulo="Sigla"
          dica={unidade === null ? DICA_DA_SIGLA.nova : DICA_DA_SIGLA.edicao}
          erro={errors.sigla?.message}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={5}
          className="uppercase"
          {...register('sigla')}
        />
        <CampoDeTexto
          id="unidade-nome"
          rotulo="Nome"
          erro={errors.nome?.message}
          autoComplete="off"
          {...register('nome')}
        />
        {unidade !== null && (
          <CaixaDeAtivo
            rotulo="Unidade ativa"
            dica="Desativada, ela sai das escolhas de carteira e de assistido. Nada se apaga."
            {...register('ativa')}
          />
        )}
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo={unidade === null ? 'Cadastrar unidade' : 'Salvar alterações'}
        enviando={isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
