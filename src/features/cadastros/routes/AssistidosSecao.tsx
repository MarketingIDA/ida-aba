import { UserRound } from 'lucide-react';
import { useState } from 'react';

import {
  type AssistidoNaTela,
  ehRascunho,
  FILTRO_DOS_RASCUNHOS,
  filtrarAssistidos,
  type FiltroDosAssistidos,
  itemDoAssistido,
  opcoesDeCarteiraDoAssistido,
  opcoesDePlano,
  opcoesDoFiltroDeCarteira,
} from '@/features/cadastros/assistidos';
import { BuscaDosAssistidos } from '@/features/cadastros/components/BuscaDosAssistidos';
import { FaltaParaCadastrar } from '@/features/cadastros/components/FaltaParaCadastrar';
import {
  FormularioDeAssistido,
  type ValoresDoAssistido,
} from '@/features/cadastros/components/FormularioDeAssistido';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import { ListaDoCadastro } from '@/features/cadastros/components/ListaDoCadastro';
import { SecaoDoCadastro } from '@/features/cadastros/components/SecaoDoCadastro';
import { useSalvarAssistido } from '@/features/cadastros/queries';
import { PorNaCarteira } from '@/features/cadastros/routes/PorNaCarteira';
import { SincronizacaoDaTita } from '@/features/cadastros/routes/SincronizacaoDaTita';
import { type DadosDosAssistidos, useAssistidos } from '@/features/cadastros/routes/useAssistidos';
import { useGaveta } from '@/features/cadastros/routes/useGaveta';
import { marcacaoDaLista, useMarcacao } from '@/features/cadastros/routes/useMarcacao';

const VAZIO = {
  icone: UserRound,
  titulo: 'Nenhum assistido cadastrado',
  descricao:
    'Sincronize com a Tita ou cadastre à mão quem é atendido, cada um na carteira da sua unidade e turno.',
};

const SEM_CARTEIRA = [
  { texto: 'Nenhuma carteira ativa.', rota: '/cadastros/carteiras', link: 'Ir para Carteiras' },
];

interface PropsDaGaveta {
  gaveta: ReturnType<typeof useGaveta<AssistidoNaTela>>;
  dados: DadosDosAssistidos | undefined;
  aoSalvar: (valores: ValoresDoAssistido) => Promise<unknown>;
}

/** O formulário (novo ou alteração), ou o que falta antes do primeiro assistido. */
function ConteudoDaGaveta({ gaveta, dados, aoSalvar }: Readonly<PropsDaGaveta>) {
  if (dados === undefined) {
    return (
      <p role="status" className="px-5 py-5 text-sm font-semibold text-texto-2">
        Carregando as carteiras e os planos…
      </p>
    );
  }
  const editando = gaveta.item;
  const carteiras = opcoesDeCarteiraDoAssistido(dados.carteiras, editando?.carteiraId);
  if (editando === null && carteiras.length === 0) {
    return (
      <FaltaParaCadastrar oQue="um assistido" faltas={SEM_CARTEIRA} aoFechar={gaveta.fechar} />
    );
  }
  return (
    <FormularioDeAssistido
      assistido={editando}
      carteiras={carteiras}
      planos={opcoesDePlano(dados.planos, editando?.planoId)}
      aoSalvar={aoSalvar}
      aoCancelar={gaveta.fechar}
    />
  );
}

function GavetaDoAssistido(props: Readonly<PropsDaGaveta>) {
  const editando = props.gaveta.item;
  return (
    <GavetaDoCadastro
      aberta={props.gaveta.aberta}
      aoFechar={props.gaveta.fechar}
      titulo={editando === null ? 'Novo assistido' : `Editar ${editando.nome}`}
      descricao="Só a coordenação geral cadastra e altera assistidos."
      chave={editando?.id ?? 'novo'}
    >
      <ConteudoDaGaveta {...props} />
    </GavetaDoCadastro>
  );
}

/** O aviso da lista vazia diz qual filtro deixou ninguém. */
function ninguemNo({ busca, carteiraId }: FiltroDosAssistidos) {
  if (busca.trim() === '') return 'Nenhum assistido nesta carteira.';
  return carteiraId === '' ? 'Ninguém com este nome.' : 'Ninguém com este nome nesta carteira.';
}

interface PropsDaLista {
  dados: DadosDosAssistidos | undefined;
  aoEditar: (assistido: AssistidoNaTela) => void;
  aoAvisar: (texto: string) => void;
}

/**
 * A busca, a lista filtrada e, sem ninguém no filtro, o aviso em vez de uma lista vazia. Nos
 * rascunhos, a lista ganha as caixas de marcar e a barra que os põe numa carteira em lote.
 */
function ListaDosAssistidos({ dados, aoEditar, aoAvisar }: Readonly<PropsDaLista>) {
  const [filtro, setFiltro] = useState<FiltroDosAssistidos>({ busca: '', carteiraId: '' });
  const todos = dados?.assistidos ?? [];
  const marcacao = useMarcacao(todos);
  const filtrados = filtrarAssistidos(todos, filtro);
  const emLote = filtro.carteiraId === FILTRO_DOS_RASCUNHOS && todos.some(ehRascunho);
  return (
    <div className="flex flex-col gap-3">
      <BuscaDosAssistidos
        filtro={filtro}
        aoMudar={(novo) => {
          // A marcação vale só dentro dos rascunhos; a busca pelo nome não a desfaz.
          if (novo.carteiraId !== filtro.carteiraId) marcacao.limpar();
          setFiltro(novo);
        }}
        carteiras={opcoesDoFiltroDeCarteira(dados?.carteiras ?? [])}
        mostrando={filtrados.length}
        total={todos.length}
      />
      {emLote && (
        <PorNaCarteira
          lista={filtrados}
          marcacao={marcacao}
          carteiras={dados?.carteiras ?? []}
          aoAvisar={aoAvisar}
        />
      )}
      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-borda bg-superficie px-5 py-4 text-sm font-semibold text-texto-2">
          {ninguemNo(filtro)}
        </p>
      ) : (
        <ListaDoCadastro
          rotulo="Assistidos cadastrados"
          rotuloDoInativo="Desativado"
          itens={filtrados.map(itemDoAssistido)}
          marcacao={emLote ? marcacaoDaLista(marcacao, filtrados) : undefined}
          aoEditar={(id) => {
            const assistido = filtrados.find((a) => a.id === id);
            if (assistido !== undefined) aoEditar(assistido);
          }}
        />
      )}
    </div>
  );
}

/** Quem é atendido, em qual carteira e com qual plano: a lista, a busca, o cadastro e a alteração. */
export function AssistidosSecao() {
  const { consulta, dados } = useAssistidos();
  const salvar = useSalvarAssistido();
  const gaveta = useGaveta<AssistidoNaTela>();
  const [aviso, setAviso] = useState('');

  async function aoSalvar(valores: ValoresDoAssistido) {
    // A chave estrangeira é composta: a unidade vem sempre da carteira escolhida.
    const carteira = dados?.carteiras.find((c) => c.id === valores.carteiraId);
    if (carteira === undefined) throw new Error('Carteira fora da lista.');
    const novo = gaveta.item === null;
    const salvo = await salvar.mutateAsync({
      dados: { ...valores, unidadeId: carteira.unidadeId },
      id: gaveta.item?.id,
    });
    setAviso(novo ? `Cadastro de ${salvo.nome} criado.` : `Alterações de ${salvo.nome} salvas.`);
    gaveta.fechar();
  }

  return (
    <SecaoDoCadastro
      titulo="Assistidos"
      descricao="Quem é atendido, em qual carteira e com qual plano. Quem vem da Tita entra como rascunho, até ganhar a carteira. O número na unidade, que entra no código da evolução, o sistema dá sozinho."
      botao="Novo assistido"
      aoCriar={gaveta.abrirNovo}
      aviso={aviso}
      consulta={consulta}
      vazio={VAZIO}
      topo={<SincronizacaoDaTita />}
      lista={<ListaDosAssistidos dados={dados} aoEditar={gaveta.abrirEdicao} aoAvisar={setAviso} />}
      gaveta={<GavetaDoAssistido gaveta={gaveta} dados={dados} aoSalvar={aoSalvar} />}
    />
  );
}
