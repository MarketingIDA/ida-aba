import type { UseFormRegisterReturn } from 'react-hook-form';

import { CampoTravado } from '@/features/cadastros/components/CamposDoFormulario';
import { EscolhaEmCartoes } from '@/features/cadastros/components/EscolhaEmCartoes';
import { type Papel, ROTULO_DO_PAPEL } from '@/hooks/useUsuario';

const DESCRICOES: Record<Papel, string> = {
  coordenador: 'Confere e conclui as evoluções da própria carteira.',
  coordenacao_geral: 'Acompanha todas as unidades e mantém os cadastros.',
  contas_medicas: 'Recebe o arquivo do mês de cada unidade.',
};

const OPCOES = (Object.keys(DESCRICOES) as Papel[]).map((papel) => ({
  valor: papel,
  rotulo: ROTULO_DO_PAPEL[papel],
  descricao: DESCRICOES[papel],
}));

interface Props extends UseFormRegisterReturn<'papel'> {
  erro?: string | undefined;
}

/** O papel em cartões: cada um diz o que a pessoa faz no sistema. */
export function EscolhaDoPapel(props: Readonly<Props>) {
  return <EscolhaEmCartoes id="pessoa-papel" legenda="Papel" opcoes={OPCOES} {...props} />;
}

/** Na própria linha, o papel aparece sem escolha: ninguém se tira da coordenação geral. */
export function PapelTravado({ papel }: Readonly<{ papel: Papel }>) {
  return (
    <CampoTravado
      rotulo="Papel"
      valor={ROTULO_DO_PAPEL[papel]}
      explicacao="Para mudar o próprio papel ou se desativar, peça a outra coordenação geral."
    />
  );
}
