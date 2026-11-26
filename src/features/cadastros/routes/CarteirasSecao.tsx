import { Briefcase } from 'lucide-react';
import { useState } from 'react';

import type { NovaCarteira } from '@/features/cadastros/api/carteiras.api';
import {
  agruparCarteiras,
  type CarteiraDaLista,
  itemDaCarteira,
  nomeDaCarteira,
  opcoesDeUnidade,
  passosDaSituacao,
  turnosOcupados,
} from '@/features/cadastros/carteiras';
import { FaltaParaCadastrar } from '@/features/cadastros/components/FaltaParaCadastrar';
import {
  FormularioDaCarteira,
  FormularioDeNovaCarteira,
} from '@/features/cadastros/components/FormularioDeCarteira';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import { ListaDoCadastro } from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { useAtribuirCarteiras, useSalvarCarteira } from '@/features/cadastros/queries';
import { type DadosDasCarteiras, useCarteiras } from '@/features/cadastros/routes/useCarteiras';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { ROTULO_DO_TURNO } from '@/utils/turno';

const VAZIO = {
  icone: Briefcase,
  titulo: 'Nenhuma carteira cadastrada',
  descricao:
    'Cada carteira junta uma unidade e um turno. Quem coordena entra depois, no cadastro da pessoa.',
};

const DESCRICAO =
  'Uma carteira por unidade e turno. Quem coordena se escolhe no cadastro da pessoa, e o mesmo turno pode ter mais de um coordenador.';

const SEM_UNIDADE = [
  { texto: 'Nenhuma unidade ativa.', rota: '/cadastros/unidades', link: 'Ir para Unidades' },
];

interface PropsDaGaveta {
  gaveta: ReturnType<typeof useGaveta<CarteiraDaLista>>;
  dados: DadosDasCarteiras | undefined;
  aoCadastrar: (valores: NovaCarteira) => Promise<unknown>;
  aoAlterar: (valores: { ativa: boolean }) => Promise<unknown>;
}

/** A alteração, a falta de unidade, ou o cadastro de uma carteira nova. */
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
      <FormularioDaCarteira carteira={editando} aoSalvar={aoAlterar} aoCancelar={gaveta.fechar} />
    );
  }
  const unidades = opcoesDeUnidade(dados.unidades);
  if (unidades.length === 0) {
    return <FaltaParaCadastrar oQue="uma carteira" faltas={SEM_UNIDADE} aoFechar={gaveta.fechar} />;
  }
  return (
    <FormularioDeNovaCarteira
      unidades={unidades}
      ocupadosNa={(unidadeId) => turnosOcupados(dados.carteiras, unidadeId)}
      aoSalvar={aoCadastrar}
      aoCancelar={gaveta.fechar}
    />
  );
}

/** A janela: título pela carteira que está aberta (ou "Nova carteira") e o conteúdo. */
function GavetaDaCarteira(props: Readonly<PropsDaGaveta>) {
  const { gaveta } = props;
  const editando = gaveta.item;
  return (
    <GavetaDoCadastro
      aberta={gaveta.aberta}
      aoFechar={gaveta.fechar}
      titulo={editando === null ? 'Nova carteira' : `Editar carteira ${nomeDaCarteira(editando)}`}
      descricao="A carteira é a unidade e o turno. Quem coordena entra pelo cadastro da pessoa."
      chave={editando?.id ?? 'nova'}
    >
      <ConteudoDaGaveta {...props} />
    </GavetaDoCadastro>
  );
}

/** As carteiras de cada unidade e turno: a lista, o cadastro e a desativação. */
export function CarteirasSecao() {
  const { consulta, dados } = useCarteiras();
  const salvar = useSalvarCarteira();
  const atribuir = useAtribuirCarteiras();
  const gaveta = useGaveta<CarteiraDaLista>();
  const [aviso, setAviso] = useState('');
  const carteiras = agruparCarteiras(dados?.carteiras ?? []);

  async function aoCadastrar(valores: NovaCarteira) {
    const salva = await salvar.mutateAsync({ valores });
    const sigla = dados?.unidades.find((unidade) => unidade.id === salva.unidadeId)?.sigla;
    setAviso(`Carteira ${sigla ?? ''} · ${ROTULO_DO_TURNO[salva.turno]} cadastrada.`);
    gaveta.fechar();
  }

  async function aoAlterar({ ativa }: { ativa: boolean }) {
    if (gaveta.item === null) return;
    await atribuir.mutateAsync(passosDaSituacao(gaveta.item, ativa));
    setAviso(`Carteira ${nomeDaCarteira(gaveta.item)} salva.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Carteiras"
      descricao={DESCRICAO}
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
