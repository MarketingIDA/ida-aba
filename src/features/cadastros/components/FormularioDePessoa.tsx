import { zodResolver } from '@hookform/resolvers/zod';
import {
  type Control,
  type DefaultValues,
  type FieldErrors,
  useForm,
  type UseFormRegister,
  useWatch,
} from 'react-hook-form';

import type { DadosDaPessoa, Pessoa } from '@/features/cadastros/api/pessoas.api';
import {
  CaixaDeAtivo,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { EscolhaDoPapel, PapelTravado } from '@/features/cadastros/components/EscolhaDoPapel';
import { type CamposDaPessoa, esquemaPessoa } from '@/features/cadastros/esquemas';

interface Props {
  /** `null`: cadastro de uma pessoa nova. */
  pessoa: Pessoa | null;
  /** A própria linha de quem está editando: papel e "ativa" não aparecem para mudar. */
  ehVoce: boolean;
  aoSalvar: (valores: DadosDaPessoa) => Promise<unknown>;
  aoCancelar: () => void;
}

interface PropsDosCampos extends Omit<Props, 'aoSalvar' | 'aoCancelar'> {
  register: UseFormRegister<CamposDaPessoa>;
  control: Control<CamposDaPessoa, unknown, DadosDaPessoa>;
  errors: FieldErrors<CamposDaPessoa>;
}

const DICA_DO_EMAIL = {
  semConta: 'A pessoa entra no sistema com este e-mail.',
  comConta: 'A pessoa já entra com este e-mail; ele não muda pelo cadastro.',
};

const valoresIniciais = (pessoa: Pessoa | null): DefaultValues<CamposDaPessoa> => ({
  nome: pessoa?.nome ?? '',
  email: pessoa?.email ?? '',
  // Pessoa nova começa sem papel: a escolha é obrigatória, porque decide o que ela vê.
  ...(pessoa === null ? {} : { papel: pessoa.papel }),
  crp: pessoa?.crp ?? '',
  ativo: pessoa?.ativo ?? true,
});

/** O papel (travado na própria linha) e, para quem coordena unidade, o CRP. */
function PapelECrp({ pessoa, ehVoce, register, control, errors }: Readonly<PropsDosCampos>) {
  const papel = useWatch({ control, name: 'papel' });
  return (
    <>
      {ehVoce && pessoa !== null ? (
        <PapelTravado papel={pessoa.papel} />
      ) : (
        <EscolhaDoPapel erro={errors.papel?.message} {...register('papel')} />
      )}
      {papel === 'coordenador' && (
        <CampoDeTexto
          id="pessoa-crp"
          rotulo="CRP (opcional)"
          dica="Como no carimbo, por exemplo 06/12345. Vai na assinatura do arquivo do mês."
          erro={errors.crp?.message}
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          {...register('crp')}
        />
      )}
    </>
  );
}

/** Nome, e-mail (travado depois da conta), papel, CRP e, na alteração, se segue ativa. */
function CorpoDaPessoa(props: Readonly<PropsDosCampos>) {
  const { pessoa, ehVoce, register, errors } = props;
  const temConta = pessoa?.temConta === true;
  return (
    <CorpoDoFormulario>
      <CampoDeTexto
        id="pessoa-nome"
        rotulo="Nome"
        erro={errors.nome?.message}
        autoComplete="off"
        {...register('nome')}
      />
      <CampoDeTexto
        id="pessoa-email"
        rotulo="E-mail"
        type="email"
        dica={temConta ? DICA_DO_EMAIL.comConta : DICA_DO_EMAIL.semConta}
        erro={errors.email?.message}
        autoComplete="off"
        spellCheck={false}
        readOnly={temConta}
        className="read-only:bg-neutro-suave read-only:text-texto-2"
        {...register('email')}
      />
      <PapelECrp {...props} />
      {pessoa !== null && !ehVoce && (
        <CaixaDeAtivo
          rotulo="Pessoa ativa"
          dica="Desativada, ela perde o acesso na hora. Nada se apaga."
          {...register('ativo')}
        />
      )}
    </CorpoDoFormulario>
  );
}

export function FormularioDePessoa({ pessoa, ehVoce, aoSalvar, aoCancelar }: Readonly<Props>) {
  const { register, handleSubmit, formState, control } = useForm<
    CamposDaPessoa,
    unknown,
    DadosDaPessoa
  >({ resolver: zodResolver(esquemaPessoa), defaultValues: valoresIniciais(pessoa) });
  const { erro, enviar } = useEnvio(aoSalvar);

  return (
    <form
      noValidate
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <CorpoDaPessoa
        pessoa={pessoa}
        ehVoce={ehVoce}
        register={register}
        control={control}
        errors={formState.errors}
      />
      <RodapeDoFormulario
        rotulo={pessoa === null ? 'Cadastrar pessoa' : 'Salvar alterações'}
        enviando={formState.isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
