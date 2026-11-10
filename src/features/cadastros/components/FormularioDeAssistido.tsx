import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  type DefaultValues,
  type FieldErrors,
  useForm,
  type UseFormRegister,
} from 'react-hook-form';

import type { AssistidoNaTela } from '@/features/cadastros/assistidos';
import type { OpcaoDoSeletor } from '@/features/cadastros/carteiras';
import {
  CaixaDeAtivo,
  CampoDeSelecao,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { EscolhaEmCartoes } from '@/features/cadastros/components/EscolhaEmCartoes';
import { type CamposDoAssistido, esquemaAssistido } from '@/features/cadastros/esquemas';

/** O que o formulário entrega: a unidade quem salva tira da carteira escolhida. */
export type ValoresDoAssistido = z.output<typeof esquemaAssistido>;

interface Props {
  /** `null`: cadastro de um assistido novo. */
  assistido: AssistidoNaTela | null;
  carteiras: readonly OpcaoDoSeletor[];
  planos: readonly OpcaoDoSeletor[];
  aoSalvar: (valores: ValoresDoAssistido) => Promise<unknown>;
  aoCancelar: () => void;
}

const GENEROS = [
  { valor: 'feminino', rotulo: 'Feminino', descricao: 'O texto diz “a assistida”.' },
  { valor: 'masculino', rotulo: 'Masculino', descricao: 'O texto diz “o assistido”.' },
];

const DICA_DA_CARTEIRA = {
  novo: 'Quem coordena a carteira vê o assistido e as evoluções dele.',
  edicao:
    'Em outra unidade, o assistido ganha um número novo nela; os códigos de evolução já dados não mudam.',
};

const valoresIniciais = (assistido: AssistidoNaTela | null): DefaultValues<CamposDoAssistido> => ({
  nome: assistido?.nome ?? '',
  ...(assistido === null ? {} : { genero: assistido.genero }),
  dataNascimento: assistido?.dataNascimento ?? '',
  planoId: assistido?.planoId === null || assistido === null ? '' : String(assistido.planoId),
  carteiraId: assistido === null ? '' : String(assistido.carteiraId),
  ativo: assistido?.ativo ?? true,
});

interface PropsDoCorpo extends Omit<Props, 'aoSalvar' | 'aoCancelar'> {
  register: UseFormRegister<CamposDoAssistido>;
  errors: FieldErrors<CamposDoAssistido>;
}

/** Quem é: nome, como o texto se refere e nascimento. */
function IdentidadeDoAssistido({
  register,
  errors,
}: Readonly<Pick<PropsDoCorpo, 'register' | 'errors'>>) {
  return (
    <>
      <CampoDeTexto
        id="assistido-nome"
        rotulo="Nome completo"
        dica="Com sobrenome, como nos documentos."
        erro={errors.nome?.message}
        autoComplete="off"
        {...register('nome')}
      />
      <EscolhaEmCartoes
        id="assistido-genero"
        legenda="Como o texto se refere"
        opcoes={GENEROS}
        erro={errors.genero?.message}
        {...register('genero')}
      />
      <CampoDeTexto
        id="assistido-nascimento"
        rotulo="Data de nascimento (opcional)"
        type="date"
        min="1990-01-01"
        erro={errors.dataNascimento?.message}
        {...register('dataNascimento')}
      />
    </>
  );
}

/** Nome, gênero, nascimento, plano, carteira e, na alteração, se segue ativo. */
function CorpoDoAssistido({
  assistido,
  carteiras,
  planos,
  register,
  errors,
}: Readonly<PropsDoCorpo>) {
  return (
    <CorpoDoFormulario>
      <IdentidadeDoAssistido register={register} errors={errors} />
      <CampoDeSelecao
        id="assistido-plano"
        rotulo="Plano de saúde"
        vazio="Sem plano"
        dica="Sem plano, a evolução do mês fica bloqueada até o plano entrar."
        opcoes={planos}
        {...register('planoId')}
      />
      <CampoDeSelecao
        id="assistido-carteira"
        rotulo="Carteira"
        vazio="Escolha a carteira"
        dica={assistido === null ? DICA_DA_CARTEIRA.novo : DICA_DA_CARTEIRA.edicao}
        opcoes={carteiras}
        erro={errors.carteiraId?.message}
        {...register('carteiraId')}
      />
      {assistido !== null && (
        <CaixaDeAtivo
          rotulo="Cadastro ativo"
          dica="Desativado, só aparece na lista do mês em que já tem evolução. Nada se apaga."
          {...register('ativo')}
        />
      )}
    </CorpoDoFormulario>
  );
}

export function FormularioDeAssistido(props: Readonly<Props>) {
  const { assistido, aoSalvar, aoCancelar } = props;
  const { register, handleSubmit, formState } = useForm<
    CamposDoAssistido,
    unknown,
    ValoresDoAssistido
  >({
    resolver: zodResolver(esquemaAssistido),
    defaultValues: valoresIniciais(assistido),
  });
  const { erro, enviar } = useEnvio(aoSalvar);

  return (
    <form
      noValidate
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <CorpoDoAssistido {...props} register={register} errors={formState.errors} />
      <RodapeDoFormulario
        rotulo={assistido === null ? 'Cadastrar assistido' : 'Salvar alterações'}
        enviando={formState.isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
