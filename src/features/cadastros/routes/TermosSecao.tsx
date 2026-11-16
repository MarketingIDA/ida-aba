import { useQuery } from '@tanstack/react-query';
import { Type } from 'lucide-react';
import { useState } from 'react';

import type { DadosDoTermo, TermoInadequado } from '@/features/cadastros/api/termos.api';
import { FormularioDeTermo } from '@/features/cadastros/components/FormularioDeTermo';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import { ListaDoCadastro } from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { termosOptions, useSalvarTermo } from '@/features/cadastros/termos';

const VAZIO = {
  icone: Type,
  titulo: 'Nenhum termo na lista',
  descricao:
    'Inclua as palavras que expõem o assistido, cada uma com o termo técnico que a substitui. A evolução alerta quando o texto usa uma delas.',
};

/** O termo como linha da lista: o substituto vai embaixo. */
const comoItem = (t: TermoInadequado) => ({
  id: t.id,
  nome: t.termo,
  detalhe: `Troca por: ${t.substituto}`,
  ativo: t.ativo,
});

/**
 * Termos inadequados (E10, P12): a lista que a coordenação geral mantém. Na evolução, o termo que
 * aparece no texto vira alerta, com a troca pelo substituto em um toque.
 */
export function TermosSecao() {
  const consulta = useQuery(termosOptions());
  const salvar = useSalvarTermo();
  const gaveta = useGaveta<TermoInadequado>();
  const [aviso, setAviso] = useState('');
  const termos = consulta.data ?? [];
  const editando = gaveta.item;

  async function aoSalvar(dados: DadosDoTermo) {
    const salvo = await salvar.mutateAsync({ dados, id: editando?.id });
    setAviso(`Termo "${salvo.termo}" ${editando === null ? 'incluído' : 'salvo'}.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Termos inadequados"
      descricao="Palavras que expõem o assistido. A evolução marca o termo no texto e troca pelo substituto técnico em um toque."
      botao="Novo termo"
      aoCriar={gaveta.abrirNovo}
      aviso={aviso}
      consulta={consulta}
      vazio={VAZIO}
      lista={
        <ListaDoCadastro
          rotulo="Termos da lista"
          rotuloDoInativo="Desativado"
          itens={termos.map(comoItem)}
          aoEditar={(id) => {
            const termo = termos.find((t) => t.id === id);
            if (termo !== undefined) gaveta.abrirEdicao(termo);
          }}
        />
      }
      gaveta={
        <GavetaDoCadastro
          aberta={gaveta.aberta}
          aoFechar={gaveta.fechar}
          titulo={editando === null ? 'Novo termo' : `Editar "${editando.termo}"`}
          descricao="Só a coordenação geral mantém a lista de termos."
          chave={editando?.id ?? 'novo'}
        >
          <FormularioDeTermo termo={editando} aoSalvar={aoSalvar} aoCancelar={gaveta.fechar} />
        </GavetaDoCadastro>
      }
    />
  );
}
