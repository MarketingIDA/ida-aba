import { zodResolver } from '@hookform/resolvers/zod';
import { type Control, useForm, type UseFormRegister, useWatch } from 'react-hook-form';

import type { NovaCarteira } from '@/features/cadastros/api/carteiras.api';
import {
  type CarteiraDaLista,
  coordenadoresDa,
  type OpcaoDoSeletor,
  opcoesDeTurno,
  SEM_COORDENADOR,
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

const ONDE_SE_ESCOLHE =
  'Quem coordena se escolhe na aba Pessoas, no cadastro de cada coordenador. O mesmo turno pode ter mais de um.';

interface PropsDaNova {
  unidades: readonly OpcaoDoSeletor[];
  /** Turnos da unidade que já têm carteira ativa. */
  ocupadosNa: (unidadeId: number) => ReadonlySet<Turno>;
  aoSalvar: (valores: NovaCarteira) => Promise<unknown>;
  aoCancelar: () => void;
}

interface PropsDoTurno {
  control: Control<CamposDaNovaCarteira, unknown, NovaCarteira>;
  register: UseFormRegister<CamposDaNovaCarteira>;
  erro: string | undefined;
  ocupadosNa: PropsDaNova['ocupadosNa'];
}

/** Os turnos; escolhida a unidade, cada um diz se está livre ou se já tem carteira. */
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

/** Carteira nova: a unidade e o turno (o que já tem carteira não se escolhe). Sem coordenador. */
export function FormularioDeNovaCarteira(props: Readonly<PropsDaNova>) {
  const { unidades, ocupadosNa, aoSalvar, aoCancelar } = props;
  const { register, handleSubmit, formState, control } = useForm<
    CamposDaNovaCarteira,
    unknown,
    NovaCarteira
  >({
    resolver: zodResolver(esquemaNovaCarteira),
    defaultValues: { unidadeId: '' },
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
        <p className="text-xs font-semibold text-apagado">
          A carteira nasce sem coordenador. {ONDE_SE_ESCOLHE}
        </p>
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
  carteira: CarteiraDaLista;
  aoSalvar: (valores: { ativa: boolean }) => Promise<unknown>;
  aoCancelar: () => void;
}

/** Carteira existente: mostra quem coordena e deixa desativar ou reativar. Unidade e turno ficam. */
export function FormularioDaCarteira(props: Readonly<PropsDaAlteracao>) {
  const { carteira, aoSalvar, aoCancelar } = props;
  const { register, handleSubmit, formState } = useForm<CamposDaAlteracaoDaCarteira>({
    resolver: zodResolver(esquemaAlteracaoDaCarteira),
    defaultValues: { ativa: carteira.ativa },
  });
  const { erro, enviar } = useEnvio(aoSalvar);
  const turno = ROTULO_DO_TURNO[carteira.turno].toLowerCase();
  const coordenadores = coordenadoresDa(carteira);

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
          explicacao="Para outra unidade ou outro turno, cadastre outra carteira."
        />
        <CampoTravado
          rotulo="Coordenação"
          valor={coordenadores.length === 0 ? SEM_COORDENADOR : coordenadores.join(', ')}
          explicacao={ONDE_SE_ESCOLHE}
        />
        <CaixaDeAtivo
          rotulo="Carteira ativa"
          dica="Desativada, ela sai das escolhas. Antes, os assistidos ativos dela passam para outra, na aba Assistidos. Nada se apaga."
          {...register('ativa')}
        />
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo="Salvar alterações"
        enviando={formState.isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
