import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useState } from 'react';

import type { Unidade } from '@/features/cadastros/api/cadastros.api';
import { FormularioDeUnidade } from '@/features/cadastros/components/FormularioDeUnidade';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import {
  type ItemDoCadastro,
  ListaDoCadastro,
} from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { unidadesOptions, useSalvarUnidade } from '@/features/cadastros/queries';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { formatarCnpj } from '@/utils/cnpj';

const VAZIO = {
  icone: Building2,
  titulo: 'Nenhuma unidade cadastrada',
  descricao:
    'Cadastre as unidades da clínica. Depois delas vêm as carteiras de cada unidade e turno e os assistidos.',
};

/** A linha da lista: o CNPJ embaixo do nome; a unidade ativa sem ele leva o aviso. */
function itemDaUnidade({ id, sigla, nome, cnpj, ativa }: Unidade): ItemDoCadastro {
  return {
    id,
    sigla,
    nome,
    ativo: ativa,
    ...(cnpj === null
      ? { marcas: ativa ? [{ rotulo: 'Sem CNPJ', tom: 'alerta' as const }] : [] }
      : { detalhe: `CNPJ ${formatarCnpj(cnpj)}` }),
  };
}

/** Unidades da clínica: a lista, o cadastro de uma nova e a alteração de uma existente. */
export function UnidadesSecao() {
  const consulta = useQuery(unidadesOptions());
  const salvar = useSalvarUnidade();
  const gaveta = useGaveta<Unidade>();
  const [aviso, setAviso] = useState('');
  const unidades = consulta.data ?? [];
  const editando = gaveta.item;

  async function aoSalvar(valores: Omit<Unidade, 'id'>) {
    const salva = await salvar.mutateAsync({ valores, id: editando?.id });
    setAviso(`Unidade ${salva.sigla} ${editando === null ? 'cadastrada' : 'salva'}.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Unidades"
      descricao="As unidades da clínica. A sigla de cada uma começa o código das evoluções."
      botao="Nova unidade"
      aoCriar={gaveta.abrirNovo}
      aviso={aviso}
      consulta={consulta}
      vazio={VAZIO}
      lista={
        <ListaDoCadastro
          rotulo="Unidades cadastradas"
          rotuloDoInativo="Desativada"
          itens={unidades.map(itemDaUnidade)}
          aoEditar={(id) => {
            const unidade = unidades.find((u) => u.id === id);
            if (unidade !== undefined) gaveta.abrirEdicao(unidade);
          }}
        />
      }
      gaveta={
        <GavetaDoCadastro
          aberta={gaveta.aberta}
          aoFechar={gaveta.fechar}
          titulo={editando === null ? 'Nova unidade' : `Editar ${editando.sigla}`}
          descricao="Só a coordenação geral cadastra e altera unidades."
          chave={editando?.id ?? 'nova'}
        >
          <FormularioDeUnidade unidade={editando} aoSalvar={aoSalvar} aoCancelar={gaveta.fechar} />
        </GavetaDoCadastro>
      }
    />
  );
}
