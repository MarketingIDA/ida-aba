import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useState } from 'react';

import type { DadosDaPessoa, Pessoa } from '@/features/cadastros/api/pessoas.api';
import { FormularioDePessoa } from '@/features/cadastros/components/FormularioDePessoa';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import {
  type ItemDoCadastro,
  ListaDoCadastro,
  type MarcaDoItem,
} from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { pessoasOptions, useSalvarPessoa } from '@/features/cadastros/queries';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { ROTULO_DO_PAPEL, useUsuario } from '@/hooks/useUsuario';

const VAZIO = {
  icone: Users,
  titulo: 'Nenhuma pessoa cadastrada',
  descricao: 'Cadastre quem usa o sistema: a coordenação de cada unidade e contas médicas.',
};

/** "Você" na própria linha; "Sem conta" em quem ainda não entrou (e segue ativa). */
function itemDaPessoa(pessoa: Pessoa, idDoUsuario: number | undefined): ItemDoCadastro {
  const marcas: MarcaDoItem[] = [];
  if (pessoa.id === idDoUsuario) marcas.push({ rotulo: 'Você', tom: 'info' });
  if (pessoa.ativo && !pessoa.temConta) marcas.push({ rotulo: 'Sem conta', tom: 'alerta' });
  return {
    id: pessoa.id,
    nome: pessoa.nome,
    detalhe: `${ROTULO_DO_PAPEL[pessoa.papel]} · ${pessoa.email}`,
    marcas,
    ativo: pessoa.ativo,
  };
}

interface PropsDaGaveta {
  gaveta: ReturnType<typeof useGaveta<Pessoa>>;
  idDoUsuario: number | undefined;
  aoSalvar: (valores: DadosDaPessoa) => Promise<unknown>;
}

function GavetaDaPessoa({ gaveta, idDoUsuario, aoSalvar }: Readonly<PropsDaGaveta>) {
  const editando = gaveta.item;
  return (
    <GavetaDoCadastro
      aberta={gaveta.aberta}
      aoFechar={gaveta.fechar}
      titulo={editando === null ? 'Nova pessoa' : `Editar ${editando.nome}`}
      descricao="Só a coordenação geral cadastra e altera pessoas."
      chave={editando?.id ?? 'nova'}
    >
      <FormularioDePessoa
        pessoa={editando}
        ehVoce={editando !== null && editando.id === idDoUsuario}
        aoSalvar={aoSalvar}
        aoCancelar={gaveta.fechar}
      />
    </GavetaDoCadastro>
  );
}

/** Quem usa o sistema e com qual papel: a lista, o cadastro e a alteração. */
export function PessoasSecao() {
  const consulta = useQuery(pessoasOptions());
  const salvar = useSalvarPessoa();
  const gaveta = useGaveta<Pessoa>();
  const idDoUsuario = useUsuario()?.id;
  const [aviso, setAviso] = useState('');
  const pessoas = consulta.data ?? [];

  async function aoSalvar(valores: DadosDaPessoa) {
    const nova = gaveta.item === null;
    const salva = await salvar.mutateAsync({ valores, id: gaveta.item?.id });
    setAviso(nova ? `Cadastro de ${salva.nome} criado.` : `Alterações de ${salva.nome} salvas.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Pessoas"
      descricao="Quem usa o sistema e com qual papel. Desativar corta o acesso na hora; nada se apaga."
      botao="Nova pessoa"
      aoCriar={gaveta.abrirNovo}
      aviso={aviso}
      consulta={consulta}
      vazio={VAZIO}
      lista={
        <ListaDoCadastro
          rotulo="Pessoas cadastradas"
          rotuloDoInativo="Desativada"
          itens={pessoas.map((pessoa) => itemDaPessoa(pessoa, idDoUsuario))}
          aoEditar={(id) => {
            const pessoa = pessoas.find((p) => p.id === id);
            if (pessoa !== undefined) gaveta.abrirEdicao(pessoa);
          }}
        />
      }
      gaveta={<GavetaDaPessoa gaveta={gaveta} idDoUsuario={idDoUsuario} aoSalvar={aoSalvar} />}
    />
  );
}
