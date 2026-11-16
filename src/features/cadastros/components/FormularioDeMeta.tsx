import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { type DadosDaMeta, type Meta, SITUACOES_DA_META } from '@/features/cadastros/api/metas.api';
import {
  CampoDeSelecao,
  CampoDeTexto,
  CorpoDoFormulario,
  RodapeDoFormulario,
  useEnvio,
} from '@/features/cadastros/components/CamposDoFormulario';
import { esquemaMeta, SITUACAO_DA_META } from '@/features/cadastros/metas';

interface Props {
  /** `null`: meta nova, que nasce em desenvolvimento. */
  meta: Meta | null;
  aoSalvar: (dados: DadosDaMeta) => Promise<unknown>;
  aoCancelar: () => void;
}

const OPCOES = SITUACOES_DA_META.map((valor) => ({
  valor,
  rotulo: SITUACAO_DA_META[valor].rotulo,
}));

const CAMPOS = [
  {
    nome: 'programa',
    rotulo: 'Programa',
    dica: 'O programa a que a meta pertence. Pode ficar em branco.',
  },
  {
    nome: 'texto',
    rotulo: 'Meta',
    dica: 'Como ela aparece nas metas para o mês atual da evolução.',
  },
  {
    nome: 'criterio',
    rotulo: 'Critério de alcance',
    dica: 'Quando a meta é considerada alcançada.',
  },
] as const;

/** O programa, o texto da meta, o critério de alcance e, na alteração, a situação. */
export function FormularioDeMeta({ meta, aoSalvar, aoCancelar }: Readonly<Props>) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaMeta),
    defaultValues: {
      programa: meta?.programa ?? '',
      texto: meta?.texto ?? '',
      criterio: meta?.criterio ?? '',
      situacao: meta?.situacao ?? 'desenvolvimento',
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
            id={`meta-${nome}`}
            rotulo={rotulo}
            dica={dica}
            erro={errors[nome]?.message}
            autoComplete="off"
            {...register(nome)}
          />
        ))}
        {meta !== null && (
          <CampoDeSelecao
            id="meta-situacao"
            rotulo="Situação"
            vazio="Escolha a situação"
            opcoes={OPCOES}
            erro={errors.situacao?.message}
            {...register('situacao')}
          />
        )}
      </CorpoDoFormulario>
      <RodapeDoFormulario
        rotulo={meta === null ? 'Cadastrar meta' : 'Salvar alterações'}
        enviando={isSubmitting}
        erro={erro}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}
