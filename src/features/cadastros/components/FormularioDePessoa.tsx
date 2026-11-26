import { zodResolver } from '@hookform/resolvers/zod';
import {
  type Control,
  type DefaultValues,
  type FieldErrors,
  useForm,
  type UseFormRegister,
  useWatch,
} from 'react-hook-form';

import type { Pessoa } from '@/features/cadastros/api/pessoas.api';
import {
  type CarteiraNaTela,
  carteirasDaPessoa,
  opcoesDeCarteiraDaPessoa,
} from '@/features/cadastros/carteiras';
import {
  CaixaDeAtivo,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { EscolhaDoPapel, PapelTravado } from '@/features/cadastros/components/EscolhaDoPapel';
import { EscolhaEmCartoes } from '@/features/cadastros/components/EscolhaEmCartoes';
import {
  type CamposDaPessoa,
  esquemaPessoa,
  type PessoaDoFormulario,
} from '@/features/cadastros/esquemas';

interface Props {
  /** `null`: cadastro de uma pessoa nova. */
  pessoa: Pessoa | null;
  /** A própria linha de quem está editando: papel e "ativa" não aparecem para mudar. */
  ehVoce: boolean;
  /** Todas as carteiras: quem coordena unidade escolhe as dela (unidade e turno). */
  carteiras: readonly CarteiraNaTela[];
  aoSalvar: (valores: PessoaDoFormulario) => Promise<unknown>;
  aoCancelar: () => void;
}

interface PropsDosCampos extends Omit<Props, 'aoSalvar' | 'aoCancelar'> {
  register: UseFormRegister<CamposDaPessoa>;
  control: Control<CamposDaPessoa, unknown, PessoaDoFormulario>;
  errors: FieldErrors<CamposDaPessoa>;
}

const DICA_DO_EMAIL = {
  semConta: 'A pessoa entra no sistema com este e-mail.',
  comConta: 'A pessoa já entra com este e-mail; ele não muda pelo cadastro.',
};

const valoresIniciais = (
  pessoa: Pessoa | null,
  carteiras: readonly CarteiraNaTela[],
): DefaultValues<CamposDaPessoa> => ({
  nome: pessoa?.nome ?? '',
  email: pessoa?.email ?? '',
  // Pessoa nova começa sem papel: a escolha é obrigatória, porque decide o que ela vê.
  ...(pessoa === null ? {} : { papel: pessoa.papel }),
  crp: pessoa?.crp ?? '',
  ativo: pessoa?.ativo ?? true,
  carteiras: pessoa === null ? [] : carteirasDaPessoa(carteiras, pessoa.id),
});

/** As carteiras de quem coordena: uma ou mais, e o mesmo turno pode ter mais de um coordenador. */
function CarteirasDaPessoa({ pessoa, carteiras, register }: Readonly<PropsDosCampos>) {
  const opcoes = opcoesDeCarteiraDaPessoa(carteiras, pessoa?.id);
  if (opcoes.length === 0) {
    return (
      <p className="text-xs font-semibold text-apagado">
        Nenhuma carteira ativa para escolher. Cadastre as carteiras na aba Carteiras.
      </p>
    );
  }
  return (
    <EscolhaEmCartoes
      id="pessoa-carteiras"
      legenda="Carteiras (unidade e turno)"
      tipo="checkbox"
      opcoes={opcoes}
      {...register('carteiras')}
    />
  );
}

/** O papel (travado na própria linha) e, para quem coordena unidade, o CRP e as carteiras. */
function PapelECrp(props: Readonly<PropsDosCampos>) {
  const { pessoa, ehVoce, register, control, errors } = props;
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
      {papel === 'coordenador' && <CarteirasDaPessoa {...props} />}
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

export function FormularioDePessoa(props: Readonly<Props>) {
  const { pessoa, ehVoce, carteiras, aoSalvar, aoCancelar } = props;
  const { register, handleSubmit, formState, control } = useForm<
    CamposDaPessoa,
    unknown,
    PessoaDoFormulario
  >({ resolver: zodResolver(esquemaPessoa), defaultValues: valoresIniciais(pessoa, carteiras) });
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
        carteiras={carteiras}
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
