import { zodResolver } from '@hookform/resolvers/zod';
import { type FieldErrors, useForm, type UseFormRegister } from 'react-hook-form';
import type { z } from 'zod';

import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import {
  CaixaDeAtivo,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { type CamposDaUnidade, esquemaUnidade } from '@/features/cadastros/esquemas';
import { formatarCnpj } from '@/utils/cnpj';

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

const valoresIniciais = (unidade: Unidade | null): CamposDaUnidade => ({
  sigla: unidade?.sigla ?? '',
  nome: unidade?.nome ?? '',
  cnpj: unidade === null ? '' : formatarCnpj(unidade.cnpj),
  endereco: unidade?.endereco ?? '',
  ativa: unidade?.ativa ?? true,
});

interface PropsDoCorpo {
  unidade: Unidade | null;
  register: UseFormRegister<CamposDaUnidade>;
  errors: FieldErrors<CamposDaUnidade>;
}

/** CNPJ e endereço, os dados da unidade que saem nos documentos. */
function DocumentosDaUnidade({ register, errors }: Readonly<Omit<PropsDoCorpo, 'unidade'>>) {
  return (
    <>
      <CampoDeTexto
        id="unidade-cnpj"
        rotulo="CNPJ"
        dica="Com ou sem pontos, barra e traço."
        erro={errors.cnpj?.message}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={18}
        className="uppercase"
        {...register('cnpj')}
      />
      <CampoDeTexto
        id="unidade-endereco"
        rotulo="Endereço (opcional)"
        dica="Rua, número e bairro, como devem sair nos documentos."
        erro={errors.endereco?.message}
        autoComplete="off"
        maxLength={200}
        {...register('endereco')}
      />
    </>
  );
}

/** Sigla, nome, CNPJ, endereço e, na alteração, se a unidade continua ativa. */
function CorpoDaUnidade({ unidade, register, errors }: Readonly<PropsDoCorpo>) {
  return (
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
      <DocumentosDaUnidade register={register} errors={errors} />
      {unidade !== null && (
        <CaixaDeAtivo
          rotulo="Unidade ativa"
          dica="Desativada, ela sai das escolhas de carteira e de assistido. Nada se apaga."
          {...register('ativa')}
        />
      )}
    </CorpoDoFormulario>
  );
}

export function FormularioDeUnidade({ unidade, aoSalvar, aoCancelar }: Readonly<Props>) {
  const { register, handleSubmit, formState } = useForm<
    CamposDaUnidade,
    unknown,
    z.output<typeof esquemaUnidade>
  >({
    resolver: zodResolver(esquemaUnidade),
    defaultValues: valoresIniciais(unidade),
  });
  const { erro, enviar } = useEnvio(aoSalvar);

  return (
    <form
      noValidate
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <CorpoDaUnidade unidade={unidade} register={register} errors={formState.errors} />
      <RodapeDoFormulario
        rotulo={unidade === null ? 'Cadastrar unidade' : 'Salvar alterações'}
        enviando={formState.isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
