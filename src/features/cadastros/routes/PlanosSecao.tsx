import { useQuery } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react';
import { useState } from 'react';

import type { Plano } from '@/features/cadastros/api/cadastros.api';
import { FormularioDePlano } from '@/features/cadastros/components/FormularioDePlano';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import { ListaDoCadastro } from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { planosOptions, useSalvarPlano } from '@/features/cadastros/queries';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';

const VAZIO = {
  icone: HeartPulse,
  titulo: 'Nenhum plano cadastrado',
  descricao:
    'Cadastre os planos de saúde dos assistidos. Sem o plano, a evolução do assistido não conclui.',
};

/** Planos de saúde: a lista, o cadastro de um novo e a alteração de um existente. */
export function PlanosSecao() {
  const consulta = useQuery(planosOptions());
  const salvar = useSalvarPlano();
  const gaveta = useGaveta<Plano>();
  const [aviso, setAviso] = useState('');
  const planos = consulta.data ?? [];
  const editando = gaveta.item;

  async function aoSalvar(valores: Omit<Plano, 'id'>) {
    const salvo = await salvar.mutateAsync({ valores, id: editando?.id });
    setAviso(`Plano ${salvo.nome} ${editando === null ? 'cadastrado' : 'salvo'}.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Planos de saúde"
      descricao="Os planos de saúde dos assistidos, como aparecem na evolução e no arquivo do mês."
      botao="Novo plano"
      aoCriar={gaveta.abrirNovo}
      aviso={aviso}
      consulta={consulta}
      vazio={VAZIO}
      lista={
        <ListaDoCadastro
          rotulo="Planos cadastrados"
          rotuloDoInativo="Desativado"
          itens={planos}
          aoEditar={(id) => {
            const plano = planos.find((p) => p.id === id);
            if (plano !== undefined) gaveta.abrirEdicao(plano);
          }}
        />
      }
      gaveta={
        <GavetaDoCadastro
          aberta={gaveta.aberta}
          aoFechar={gaveta.fechar}
          titulo={editando === null ? 'Novo plano' : `Editar ${editando.nome}`}
          descricao="Só a coordenação geral cadastra e altera planos."
        >
          <FormularioDePlano plano={editando} aoSalvar={aoSalvar} aoCancelar={gaveta.fechar} />
        </GavetaDoCadastro>
      }
    />
  );
}
