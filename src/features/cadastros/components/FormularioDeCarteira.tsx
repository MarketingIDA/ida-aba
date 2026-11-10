import { zodResolver } from '@hookform/resolvers/zod';
import {
  type Control,
  useForm,
  type UseFormRegister,
  type UseFormRegisterReturn,
  useWatch,
} from 'react-hook-form';

import type { AlteracaoDaCarteira, NovaCarteira } from '@/features/cadastros/api/carteiras.api';
import {
  type CarteiraNaTela,
  type OpcaoDoSeletor,
  opcoesDeTurno,
} from '@/features/cadastros/carteiras';
import {
  CaixaDeAtivo,
  CampoDeSelecao,
  CampoTravado,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { EscolhaEmCartoes } from '@/features/cadastros/components/EscolhaEmCartoes';
import {
  type CamposDaAlteracaoDaCarteira,
  type CamposDaNovaCarteira,
  esquemaAlteracaoDaCarteira,
  esquemaNovaCarteira,
} from '@/features/cadastros/esquemas';
import { ROTULO_DO_TURNO, type Turno } from '@/utils/turno';

const CLASSE_DO_FORM = 'flex min-h-0 flex-1 flex-col';

interface PropsDaNova {
  unidades: readonly OpcaoDoSeletor[];
  coordenacoes: readonly OpcaoDoSeletor[];
  /** Turnos da unidade que já têm carteira ativa, com quem coordena cada um. */
  ocupadosNa: (unidadeId: number) => ReadonlyMap<Turno, string>;
  aoSalvar: (valores: NovaCarteira) => Promise<unknown>;
  aoCancelar: () => void;
}

interface PropsDoTurno {
  control: Control<CamposDaNovaCarteira, unknown, NovaCarteira>;
  register: UseFormRegister<CamposDaNovaCarteira>;
  erro: string | undefined;
  ocupadosNa: PropsDaNova['ocupadosNa'];
}

/** Os turnos; escolhida a unidade, cada um diz se está livre ou com quem já está. */
function TurnoDaCarteira({ control, register, erro, ocupadosNa }: Readonly<PropsDoTurno>) {
  const unidadeId = useWatch({ control, name: 'unidadeId' });
  return (
    <EscolhaEmCartoes
      id="carteira-turno"
      legenda="Turno"
      opcoes={opcoesDeTurno(unidadeId === '' ? null : ocupadosNa(Number(unidadeId)))}
      erro={erro}
      {...register('turno')}
    />
  );
}

interface PropsDaCoordenacao extends UseFormRegisterReturn<'coordenadorId'> {
  opcoes: readonly OpcaoDoSeletor[];
  dica: string;
  erro: string | undefined;
}

/** Quem coordena a carteira, no cadastro e na passagem. */
function CampoDaCoordenacao(props: Readonly<PropsDaCoordenacao>) {
  return (
    <CampoDeSelecao
      id="carteira-coordenacao"
      rotulo="Coordenação"
      vazio="Escolha quem coordena"
      {...props}
    />
  );
}

/** Carteira nova: a unidade, o turno (o que já tem carteira não se escolhe) e quem coordena. */
export function FormularioDeNovaCarteira(props: Readonly<PropsDaNova>) {
  const { unidades, coordenacoes, ocupadosNa, aoSalvar, aoCancelar } = props;
  const { register, handleSubmit, formState, control } = useForm<
    CamposDaNovaCarteira,
    unknown,
    NovaCarteira
  >({
    resolver: zodResolver(esquemaNovaCarteira),
    defaultValues: { unidadeId: '', coordenadorId: '' },
  });
  const { erro, enviar } = useEnvio(aoSalvar);
  const { errors, isSubmitting } = formState;

  return (
    <form
      noValidate
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      className={CLASSE_DO_FORM}
    >
      <CorpoDoFormulario>
        <CampoDeSelecao
          id="carteira-unidade"
          rotulo="Unidade"
          vazio="Escolha a unidade"
          opcoes={unidades}
          erro={errors.unidadeId?.message}
          {...register('unidadeId')}
        />
        <TurnoDaCarteira
          control={control}
          register={register}
          erro={errors.turno?.message}
          ocupadosNa={ocupadosNa}
        />
        <CampoDaCoordenacao
          opcoes={coordenacoes}
          dica="Quem coordena vê os assistidos e as evoluções da carteira."
          erro={errors.coordenadorId?.message}
          {...register('coordenadorId')}
        />
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo="Cadastrar carteira"
        enviando={isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}

interface PropsDaAlteracao {
  carteira: CarteiraNaTela;
  coordenacoes: readonly OpcaoDoSeletor[];
  aoSalvar: (valores: AlteracaoDaCarteira) => Promise<unknown>;
  aoCancelar: () => void;
}

/** Carteira existente: passa para outra coordenação ou é desativada. Unidade e turno ficam. */
export function FormularioDaCarteira(props: Readonly<PropsDaAlteracao>) {
  const { carteira, coordenacoes, aoSalvar, aoCancelar } = props;
  const { register, handleSubmit, formState } = useForm<
    CamposDaAlteracaoDaCarteira,
    unknown,
    AlteracaoDaCarteira
  >({
    resolver: zodResolver(esquemaAlteracaoDaCarteira),
    defaultValues: { coordenadorId: String(carteira.coordenadorId), ativa: carteira.ativa },
  });
  const { erro, enviar } = useEnvio(aoSalvar);
  const { errors, isSubmitting } = formState;
  const turno = ROTULO_DO_TURNO[carteira.turno].toLowerCase();

  return (
    <form
      noValidate
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      className={CLASSE_DO_FORM}
    >
      <CorpoDoFormulario>
        <CampoTravado
          rotulo="Unidade e turno"
          valor={`${carteira.unidade.sigla} · ${carteira.unidade.nome}, ${turno}`}
          explicacao="Para outra unidade ou outro turno, desative esta carteira e cadastre outra."
        />
        <CampoDaCoordenacao
          opcoes={coordenacoes}
          dica="Passar a carteira muda quem vê os assistidos e as evoluções dela."
          erro={errors.coordenadorId?.message}
          {...register('coordenadorId')}
        />
        <CaixaDeAtivo
          rotulo="Carteira ativa"
          dica="Desativada, ela libera a unidade e o turno para outra carteira. Nada se apaga."
          {...register('ativa')}
        />
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo="Salvar alterações"
        enviando={isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
