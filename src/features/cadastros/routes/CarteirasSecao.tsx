import { Briefcase } from 'lucide-react';
import { useState } from 'react';

import type { AlteracaoDaCarteira, NovaCarteira } from '@/features/cadastros/api/carteiras.api';
import {
  type CarteiraNaTela,
  itemDaCarteira,
  nomeDaCarteira,
  opcoesDeCoordenacao,
  opcoesDeUnidade,
  turnosOcupados,
} from '@/features/cadastros/carteiras';
import { FaltaParaACarteira } from '@/features/cadastros/components/FaltaParaACarteira';
import {
  FormularioDaCarteira,
  FormularioDeNovaCarteira,
} from '@/features/cadastros/components/FormularioDeCarteira';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import { ListaDoCadastro } from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { useSalvarCarteira } from '@/features/cadastros/queries';
import { type DadosDasCarteiras, useCarteiras } from '@/features/cadastros/routes/useCarteiras';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { ROTULO_DO_TURNO } from '@/utils/turno';

const VAZIO = {
  icone: Briefcase,
  titulo: 'Nenhuma carteira cadastrada',
  descricao:
    'Cada carteira junta uma unidade, um turno e quem coordena. Depois delas vêm os assistidos.',
};

interface PropsDaGaveta {
  gaveta: ReturnType<typeof useGaveta<CarteiraNaTela>>;
  dados: DadosDasCarteiras | undefined;
  aoCadastrar: (valores: NovaCarteira) => Promise<unknown>;
  aoAlterar: (valores: AlteracaoDaCarteira) => Promise<unknown>;
}

/** A alteração, a falta de unidade ou de coordenação, ou o cadastro de uma carteira nova. */
function ConteudoDaGaveta({ gaveta, dados, aoCadastrar, aoAlterar }: Readonly<PropsDaGaveta>) {
  if (dados === undefined) {
    return (
      <p role="status" className="px-5 py-5 text-sm font-semibold text-texto-2">
        Carregando as unidades e as pessoas…
      </p>
    );
  }
  const editando = gaveta.item;
  if (editando !== null) {
    return (
      <FormularioDaCarteira
        carteira={editando}
        coordenacoes={opcoesDeCoordenacao(dados.pessoas, editando.coordenadorId)}
        aoSalvar={aoAlterar}
        aoCancelar={gaveta.fechar}
      />
    );
  }
  const unidades = opcoesDeUnidade(dados.unidades);
  const coordenacoes = opcoesDeCoordenacao(dados.pessoas);
  if (unidades.length === 0 || coordenacoes.length === 0) {
    return (
      <FaltaParaACarteira
        semUnidade={unidades.length === 0}
        semCoordenacao={coordenacoes.length === 0}
        aoFechar={gaveta.fechar}
      />
    );
  }
  return (
    <FormularioDeNovaCarteira
      unidades={unidades}
      coordenacoes={coordenacoes}
      ocupadosNa={(unidadeId) => turnosOcupados(dados.carteiras, unidadeId)}
      aoSalvar={aoCadastrar}
      aoCancelar={gaveta.fechar}
    />
  );
}

/** A gaveta: título pela carteira que está aberta (ou "Nova carteira") e o conteúdo. */
function GavetaDaCarteira(props: Readonly<PropsDaGaveta>) {
  const { gaveta } = props;
  const editando = gaveta.item;
  return (
    <GavetaDoCadastro
      aberta={gaveta.aberta}
      aoFechar={gaveta.fechar}
      titulo={editando === null ? 'Nova carteira' : `Editar carteira ${nomeDaCarteira(editando)}`}
      descricao="Só a coordenação geral cadastra e altera carteiras."
      chave={editando?.id ?? 'nova'}
    >
      <ConteudoDaGaveta {...props} />
    </GavetaDoCadastro>
  );
}

/** Quem coordena cada unidade e turno: a lista, o cadastro, a passagem e a desativação. */
export function CarteirasSecao() {
  const { consulta, dados } = useCarteiras();
  const salvar = useSalvarCarteira();
  const gaveta = useGaveta<CarteiraNaTela>();
  const [aviso, setAviso] = useState('');
  const carteiras = dados?.carteiras ?? [];
  const editando = gaveta.item;

  async function aoCadastrar(valores: NovaCarteira) {
    const salva = await salvar.mutateAsync({ valores });
    const sigla = dados?.unidades.find((unidade) => unidade.id === salva.unidadeId)?.sigla;
    setAviso(`Carteira ${sigla ?? ''} · ${ROTULO_DO_TURNO[salva.turno]} cadastrada.`);
    gaveta.fechar();
  }

  async function aoAlterar(valores: AlteracaoDaCarteira) {
    if (editando === null) return;
    await salvar.mutateAsync({ id: editando.id, valores });
    setAviso(`Carteira ${nomeDaCarteira(editando)} salva.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Carteiras"
      descricao="Uma carteira ativa por unidade e turno, com quem a coordena. Desativar libera a vaga; nada se apaga."
      botao="Nova carteira"
      aoCriar={gaveta.abrirNovo}
      aviso={aviso}
      consulta={consulta}
      vazio={VAZIO}
      lista={
        <ListaDoCadastro
          rotulo="Carteiras cadastradas"
          rotuloDoInativo="Desativada"
          itens={carteiras.map(itemDaCarteira)}
          aoEditar={(id) => {
            const carteira = carteiras.find((c) => c.id === id);
            if (carteira !== undefined) gaveta.abrirEdicao(carteira);
          }}
        />
      }
      gaveta={
        <GavetaDaCarteira
          gaveta={gaveta}
          dados={dados}
          aoCadastrar={aoCadastrar}
          aoAlterar={aoAlterar}
        />
      }
    />
  );
}
